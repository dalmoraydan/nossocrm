import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isAllowedOrigin } from '@/lib/security/sameOrigin';

function json<T>(body: T, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}

const AgendaConfigSchema = z.object({
  days: z.object({
    monday: z.boolean(),
    tuesday: z.boolean(),
    wednesday: z.boolean(),
    thursday: z.boolean(),
    friday: z.boolean(),
    saturday: z.boolean(),
  }).strict(),
  hours: z.object({
    monday: z.object({ start: z.string(), end: z.string() }).strict(),
    tuesday: z.object({ start: z.string(), end: z.string() }).strict(),
    wednesday: z.object({ start: z.string(), end: z.string() }).strict(),
    thursday: z.object({ start: z.string(), end: z.string() }).strict(),
    friday: z.object({ start: z.string(), end: z.string() }).strict(),
    saturday: z.object({ start: z.string(), end: z.string() }).strict(),
  }).strict(),
  slotDurationMinutes: z.enum(['30', '60', '90', '120']).transform(Number),
  intervalMinutes: z.enum(['0', '15', '30']).transform(Number),
  blockedDates: z.array(z.string()).optional(),
  blockedTimes: z.array(z.object({ date: z.string(), from: z.string(), to: z.string() })).optional(),
}).strict();

const DEFAULT_AGENDA_CONFIG = {
  days: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
  },
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
  blockedTimes: [],
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return json({ error: 'Unauthorized' }, 401);

  const profile = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
  if (profile.error || !profile.data?.organization_id) {
    return json({ error: 'Profile not found' }, 404);
  }

  const orgSettings = await supabase
    .from('organization_settings')
    .select('agenda_config')
    .eq('organization_id', profile.data.organization_id)
    .maybeSingle();

  if (orgSettings.error) {
    return json({ error: orgSettings.error.message }, 500);
  }

  const agendaConfig = orgSettings.data?.agenda_config ?? DEFAULT_AGENDA_CONFIG;
  return json({ data: agendaConfig });
}

export async function POST(req: Request) {
  if (!isAllowedOrigin(req)) {
    return json({ error: 'Forbidden' }, 403);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return json({ error: 'Unauthorized' }, 401);

  const profile = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
  if (profile.error || !profile.data?.organization_id) {
    return json({ error: 'Profile not found' }, 404);
  }

  if (profile.data.role !== 'admin') {
    return json({ error: 'Forbidden' }, 403);
  }

  const rawBody = await req.json().catch(() => null);
  const parsed = AgendaConfigSchema.safeParse(rawBody);
  if (!parsed.success) {
    return json({ error: 'Invalid payload', details: parsed.error.flatten() }, 400);
  }

  const config = parsed.data;

  const { error: upsertError } = await supabase
    .from('organization_settings')
    .upsert({ organization_id: profile.data.organization_id, agenda_config: config }, { onConflict: 'organization_id' });

  if (upsertError) {
    return json({ error: upsertError.message }, 500);
  }

  return json({ ok: true });
}
