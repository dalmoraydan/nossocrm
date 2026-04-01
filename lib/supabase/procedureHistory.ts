import { supabase } from './client';
import { ProcedureHistory } from '@/types';
import { sanitizeUUID, sanitizeText, sanitizeNumber } from './utils';

export interface DbProcedureHistory {
  id: string;
  organization_id: string;
  contact_id: string;
  date: string;
  treatment: string;
  product: string | null;
  quantity: number;
  value: number;
  payment_method: string;
  result: string;
  follow_up_date: string | null;
  doctor_notes: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

function transform(history: DbProcedureHistory): ProcedureHistory {
  return {
    id: history.id,
    organizationId: history.organization_id,
    contactId: history.contact_id,
    date: history.date,
    treatment: history.treatment,
    product: history.product || undefined,
    quantity: history.quantity,
    value: history.value,
    paymentMethod: history.payment_method as ProcedureHistory['paymentMethod'],
    result: history.result as ProcedureHistory['result'],
    followUpDate: history.follow_up_date || undefined,
    doctorNotes: history.doctor_notes || undefined,
    createdAt: history.created_at,
    updatedAt: history.updated_at,
    createdBy: history.created_by || undefined,
  };
}

export const procedureHistoryService = {
  async list(contactId: string): Promise<{ data: ProcedureHistory[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('procedure_history')
        .select('*')
        .eq('contact_id', sanitizeUUID(contactId))
        .order('date', { ascending: false });

      if (error) return { data: [], error };
      return { data: (data || []).map(r => transform(r as DbProcedureHistory)), error: null };
    } catch (e) {
      return { data: [], error: e as Error };
    }
  },

  async create(entry: Omit<ProcedureHistory, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ data: ProcedureHistory | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('procedure_history')
        .insert({
          organization_id: entry.organizationId,
          contact_id: entry.contactId,
          date: entry.date,
          treatment: sanitizeText(entry.treatment),
          product: sanitizeText(entry.product),
          quantity: sanitizeNumber(entry.quantity ?? 1, 1),
          value: sanitizeNumber(entry.value ?? 0, 0),
          payment_method: entry.paymentMethod,
          result: entry.result,
          follow_up_date: entry.followUpDate || null,
          doctor_notes: sanitizeText(entry.doctorNotes),
          created_by: sanitizeUUID(entry.createdBy),
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) return { data: null, error };
      return { data: transform(data as DbProcedureHistory), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },
};
