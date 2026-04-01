import { NextRequest, NextResponse } from 'next/server';
import { contactsService } from '@/lib/supabase/contacts';
import { appointmentService } from '@/lib/supabase';
import { normalizePhoneE164 } from '@/lib/phone';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'default-secret-for-dev';

interface WebhookPayload {
  contact_name: string;
  phone: string;
  tratamento: string;
  primeira_vez: boolean;
  disponibilidade: string; // e.g., "Segunda-feira 14:00"
  resumo_conversa: string;
  data_avaliacao: string; // YYYY-MM-DD
  horario_avaliacao: string; // HH:MM
  origem: string;
}

export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret
    const authHeader = request.headers.get('X-Webhook-Secret');
    if (!authHeader || authHeader !== WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: WebhookPayload = await request.json();

    // Validate required fields
    if (!body.contact_name || !body.phone || !body.data_avaliacao || !body.horario_avaliacao) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Normalize phone
    const phoneE164 = normalizePhoneE164(body.phone);
    if (!phoneE164) {
      return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 });
    }

    // Check if contact exists by phone
    const { data: existingContacts } = await contactsService.getAll();
    const existingContact = existingContacts?.find(c => c.phone === phoneE164);

    let contactId: string;

    if (existingContact) {
      contactId = existingContact.id;
      // Update contact with new info if needed
      await contactsService.update(existingContact.id, {
        treatmentInterest: body.tratamento,
        firstTime: body.primeira_vez,
        leadOrigin: body.origem as any,
        conversationSummary: body.resumo_conversa,
      });
    } else {
      // Create new contact
      const { data: newContact, error: createError } = await contactsService.create({
        name: body.contact_name,
        phone: phoneE164,
        treatmentInterest: body.tratamento,
        firstTime: body.primeira_vez,
        leadOrigin: body.origem as any,
        conversationSummary: body.resumo_conversa,
        status: 'ACTIVE',
        stage: 'LEAD',
      });

      if (createError || !newContact) {
        return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
      }

      contactId = newContact.id;
    }

    // Check if slot is available
    const { data: existingAppointments } = await appointmentService.getAllByDate('', body.data_avaliacao);
    const conflictingAppointment = existingAppointments?.find(
      app => app.startTime === body.horario_avaliacao && app.status !== 'Disponível'
    );

    if (conflictingAppointment) {
      return NextResponse.json({ error: 'Time slot not available' }, { status: 409 });
    }

    // Create appointment
    const { data: appointment, error: appError } = await appointmentService.create({
      organizationId: '', // Will be set by RLS
      contactId,
      date: body.data_avaliacao,
      startTime: body.horario_avaliacao,
      durationMinutes: 60, // Default
      status: 'Reservado',
      treatment: body.tratamento,
      firstTime: body.primeira_vez,
      leadOrigin: body.origem as any,
      conversationSummary: body.resumo_conversa,
      notes: body.disponibilidade,
    });

    if (appError || !appointment) {
      return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      appointment_id: appointment.id,
      contact_id: contactId,
      message: 'Appointment created successfully'
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}