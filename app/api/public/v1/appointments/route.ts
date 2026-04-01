import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authPublicApi } from '@/lib/public-api/auth';
import { createStaticAdminClient } from '@/lib/supabase/server';
import { normalizePhone, normalizeText } from '@/lib/public-api/sanitize';
import { sanitizeUUID } from '@/lib/supabase/utils';

export const runtime = 'nodejs';

const AppointmentQuerySchema = z.object({
  date: z.string().optional(),
});

const ScheduleWebhookSchema = z.object({
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  tratamento: z.string().optional(),
  primeira_vez: z.boolean().optional(),
  disponibilidade: z.string().optional(),
  resumo_conversa: z.string().optional(),
  data_avaliacao: z.string().optional(),
  horario_avaliacao: z.string().optional(),
  origem: z.string().optional(),
});

function toIsoDateString(v: string | undefined) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function normalizeTimeString(v: string | undefined) {
  if (!v) return null;
  const match = v.match(/^([0-2]?\d):([0-5]\d)(?::([0-5]\d))?$/);
  if (!match) return null;
  return `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}:00`;
}

const timeToMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
};

const overlap = (aStart: number, aEnd: number, bStart: number, bEnd: number): boolean => {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
};

export async function GET(request: Request) {
  const auth = await authPublicApi(request);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const url = new URL(request.url);
  const parsed = AppointmentQuerySchema.safeParse({ date: url.searchParams.get('date') ?? undefined });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data inválida para consulta de agenda' }, { status: 422 });
  }

  const date = parsed.data.date ? toIsoDateString(parsed.data.date) : new Date().toISOString().slice(0, 10);
  if (!date) {
    return NextResponse.json({ error: 'Data inválida para consulta de agenda' }, { status: 422 });
  }

  const availableSlotMode = url.searchParams.get('available') === 'true';

  const sb = createStaticAdminClient();

  const orgSettings = await sb
    .from('organization_settings')
    .select('agenda_config')
    .eq('organization_id', auth.organizationId)
    .maybeSingle();

  if (orgSettings.error) {
    return NextResponse.json({ error: orgSettings.error.message }, { status: 500 });
  }

  const agendaConfig = orgSettings.data?.agenda_config ?? {
    days: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true },
    hours: {
      monday: { start: '09:00', end: '18:00' },
      tuesday: { start: '09:00', end: '18:00' },
      wednesday: { start: '09:00', end: '18:00' },
      thursday: { start: '09:00', end: '18:00' },
      friday: { start: '09:00', end: '18:00' },
      saturday: { start: '09:00', end: '13:00' },
    },
    slotDurationMinutes: 60,
    intervalMinutes: 0,
    blockedDates: [],
    blockedTimes: []
  };

  const appointmentsQuery = await sb
    .from('appointments')
    .select('id,date,start_time,duration_minutes,status')
    .eq('organization_id', auth.organizationId)
    .eq('date', date)
    .in('status', ['Reservado', 'Confirmado', 'Bloqueado'])
    .order('start_time', { ascending: true });

  if (appointmentsQuery.error) {
    return NextResponse.json({ error: appointmentsQuery.error.message }, { status: 500 });
  }

  if (!availableSlotMode) {
    const freeSlots = await sb
      .from('appointments')
      .select('id,date,start_time,duration_minutes,status,treatment,first_time,previous_procedure,lead_origin,conversation_summary,notes,contact_id')
      .eq('organization_id', auth.organizationId)
      .eq('date', date)
      .in('status', ['Disponível', 'Reservado', 'Confirmado'])
      .order('start_time', { ascending: true });

    if (freeSlots.error) {
      return NextResponse.json({ error: freeSlots.error.message }, { status: 500 });
    }

    return NextResponse.json({ data: freeSlots.data });
  }

  // Calcula slots disponíveis (com base na agenda e bloqueios)
  const dayName = new Date(date).toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
  const dayEnabled = agendaConfig.days?.[dayName] ?? false;

  if (!dayEnabled || (agendaConfig.blockedDates || []).includes(date)) {
    return NextResponse.json({ data: [] });
  }

  const dayHours = agendaConfig.hours?.[dayName] || { start: '09:00', end: '18:00' };
  const startMinutes = timeToMinutes(dayHours.start);
  const endMinutes = timeToMinutes(dayHours.end);
  const slotLength = Number(agendaConfig.slotDurationMinutes ?? 60);
  const intervalMinutes = Number(agendaConfig.intervalMinutes ?? 0);

  const busyAppointments = (appointmentsQuery.data || []).map(item => {
    const start = timeToMinutes(item.start_time.slice(0, 5));
    const end = start + Number(item.duration_minutes);
    return { start, end };
  });

  const blockedTimes = (agendaConfig.blockedTimes || []).filter((b: any) => b.date === date).map((b: any) => ({
    start: timeToMinutes(b.from),
    end: timeToMinutes(b.to),
  }));

  const resultSlots: any[] = [];

  for (let slotStart = startMinutes; slotStart + slotLength <= endMinutes; slotStart += slotLength + intervalMinutes) {
    const slotEnd = slotStart + slotLength;

    const blocked = blockedTimes.some(bt => overlap(slotStart, slotEnd, bt.start, bt.end));
    if (blocked) continue;

    const occupied = busyAppointments.some(appt => overlap(slotStart, slotEnd, appt.start, appt.end));
    if (occupied) continue;

    resultSlots.push({
      start_time: minutesToTime(slotStart),
      duration_minutes: slotLength,
      status: 'Disponível',
    });
  }

  return NextResponse.json({ data: resultSlots });
}

export async function POST(request: Request) {
  const auth = await authPublicApi(request);
  if (!auth.ok) return NextResponse.json(auth.body, { status: auth.status });

  const payload = await request.json().catch(() => ({}));
  const parsed = ScheduleWebhookSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Payload inválido', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const body = parsed.data;
  const contactName = normalizeText(body.contact_name);
  const phone = normalizePhone(body.phone);
  const treatment = normalizeText(body.tratamento);
  const firstTime = body.primeira_vez ?? false;
  const previousProcedure = false;
  const leadOrigin = normalizeText(body.origem);
  const conversationSummary = normalizeText(body.resumo_conversa);
  const date = toIsoDateString(body.data_avaliacao) || new Date().toISOString().slice(0, 10);
  const startTime = normalizeTimeString(body.horario_avaliacao) || '09:00:00';

  if (!contactName || !phone) {
    return NextResponse.json({ error: 'contact_name e phone são obrigatórios', code: 'VALIDATION_ERROR' }, { status: 422 });
  }

  const sb = createStaticAdminClient();

  // 1. Garantir contato
  const existingContact = await sb
    .from('contacts')
    .select('id')
    .eq('organization_id', auth.organizationId)
    .eq('phone', phone)
    .maybeSingle();

  if (existingContact.error) {
    return NextResponse.json({ error: existingContact.error.message, code: 'DB_ERROR' }, { status: 500 });
  }

  let contactId = existingContact.data?.id;

  if (!contactId) {
    const creatingContact = await sb
      .from('contacts')
      .insert({
        organization_id: auth.organizationId,
        name: contactName,
        phone,
        status: 'ACTIVE',
        stage: 'LEAD',
        source: leadOrigin || 'WhatsApp',
        treatment_interest: treatment,
        first_time: firstTime,
        previous_procedure: previousProcedure,
        lead_origin: leadOrigin,
        conversation_summary: conversationSummary,
      })
      .select('id')
      .single();

    if (creatingContact.error) {
      return NextResponse.json({ error: creatingContact.error.message, code: 'DB_ERROR' }, { status: 500 });
    }

    contactId = creatingContact.data?.id;
  }

  // 2. Verificar bloqueios ou agendamentos existentes 
  const conflictCheck = await sb
    .from('appointments')
    .select('id')
    .eq('organization_id', auth.organizationId)
    .eq('date', date)
    .eq('start_time', startTime)
    .in('status', ['Reservado','Confirmado','Bloqueado'])
    .limit(1)
    .single();

  if (conflictCheck.error) {
    return NextResponse.json({ error: conflictCheck.error.message, code: 'DB_ERROR' }, { status: 500 });
  }

  if (conflictCheck.data) {
    return NextResponse.json({ error: 'Horário não disponível', code: 'SLOT_OCCUPIED' }, { status: 409 });
  }

  // 3. Criar agendamento
  const duration = Number(body.disponibilidade || 60);
  const { data: appointment, error } = await sb
    .from('appointments')
    .insert({
      organization_id: auth.organizationId,
      contact_id: contactId,
      date,
      start_time: startTime,
      duration_minutes: duration,
      status: 'Reservado',
      treatment,
      first_time: firstTime,
      previous_procedure: previousProcedure,
      lead_origin: leadOrigin,
      conversation_summary: conversationSummary,
      notes: `Webhook GPT Maker: ${normalizeText(body.disponibilidade) || ''}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message, code: 'DB_ERROR' }, { status: 500 });
  }

  return NextResponse.json({ data: appointment, action: 'created' }, { status: 201 });
}
