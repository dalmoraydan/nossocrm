import { supabase } from './client';
import { Appointment } from '@/types';
import { sanitizeUUID, sanitizeText, sanitizeNumber } from './utils';

export interface DbAppointment {
  id: string;
  organization_id: string;
  contact_id: string | null;
  date: string;
  start_time: string;
  duration_minutes: number;
  status: string;
  treatment: string | null;
  first_time: boolean | null;
  previous_procedure: boolean | null;
  lead_origin: string | null;
  conversation_summary: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

const transformAppointment = (db: DbAppointment): Appointment => ({
  id: db.id,
  organizationId: db.organization_id,
  contactId: db.contact_id || undefined,
  date: db.date,
  startTime: db.start_time,
  durationMinutes: db.duration_minutes,
  status: db.status as Appointment['status'],
  treatment: db.treatment || undefined,
  firstTime: db.first_time ?? false,
  previousProcedure: db.previous_procedure ?? false,
  leadOrigin: (db.lead_origin as any) || undefined,
  conversationSummary: db.conversation_summary || undefined,
  notes: db.notes || undefined,
  createdAt: db.created_at,
  updatedAt: db.updated_at,
  createdBy: db.created_by || undefined,
});

export const appointmentService = {
  async getAllByDate(organizationId: string, date: string): Promise<{ data: Appointment[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('date', date)
        .order('start_time', { ascending: true });

      if (error) return { data: [], error };
      return { data: (data || []).map(r => transformAppointment(r as DbAppointment)), error: null };
    } catch (e) {
      return { data: [], error: e as Error };
    }
  },

  async getAllByDateRange(startDate: Date, endDate: Date): Promise<{ data: Appointment[]; error: Error | null }> {
    try {
      const startStr = startDate.toISOString().split('T')[0];
      const endStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .gte('date', startStr)
        .lte('date', endStr)
        .order('date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) return { data: [], error };
      return { data: (data || []).map(r => transformAppointment(r as DbAppointment)), error: null };
    } catch (e) {
      return { data: [], error: e as Error };
    }
  },

  async create(payload: Partial<Appointment> & { organizationId: string }): Promise<{ data: Appointment | null; error: Error | null }> {
    try {
      const insert = {
        organization_id: payload.organizationId,
        contact_id: sanitizeUUID(payload.contactId),
        date: payload.date,
        start_time: payload.startTime,
        duration_minutes: sanitizeNumber(payload.durationMinutes, 60),
        status: payload.status || 'Disponível',
        treatment: sanitizeText(payload.treatment),
        first_time: payload.firstTime ?? false,
        previous_procedure: payload.previousProcedure ?? false,
        lead_origin: sanitizeText(payload.leadOrigin),
        conversation_summary: sanitizeText(payload.conversationSummary),
        notes: sanitizeText(payload.notes),
        created_by: sanitizeUUID(payload.createdBy),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert(insert)
        .select('*')
        .single();

      if (error) return { data: null, error };
      return { data: transformAppointment(data as DbAppointment), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },
};
