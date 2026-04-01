import { supabase } from './client';
import { ContactPhoto } from '@/types';
import { sanitizeUUID, sanitizeText } from './utils';

export interface DbContactPhoto {
  id: string;
  organization_id: string;
  contact_id: string;
  photo_url: string;
  category: string;
  taken_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  uploaded_by: string | null;
}

function transform(photo: DbContactPhoto): ContactPhoto {
  return {
    id: photo.id,
    organizationId: photo.organization_id,
    contactId: photo.contact_id,
    photoUrl: photo.photo_url,
    category: photo.category as ContactPhoto['category'],
    takenAt: photo.taken_at || undefined,
    notes: photo.notes || undefined,
    createdAt: photo.created_at,
    updatedAt: photo.updated_at,
    uploadedBy: photo.uploaded_by || undefined,
  };
}

export const contactPhotoService = {
  async list(contactId: string): Promise<{ data: ContactPhoto[]; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('contact_photos')
        .select('*')
        .eq('contact_id', sanitizeUUID(contactId))
        .order('taken_at', { ascending: false });

      if (error) return { data: [], error };
      return { data: (data || []).map(r => transform(r as DbContactPhoto)), error: null };
    } catch (e) {
      return { data: [], error: e as Error };
    }
  },

  async insert(payload: {
    organizationId: string;
    contactId: string;
    photoUrl: string;
    category: 'antes' | 'depois' | 'ambos';
    takenAt?: string;
    notes?: string;
    uploadedBy?: string;
  }): Promise<{ data: ContactPhoto | null; error: Error | null }> {
    try {
      const { data, error } = await supabase
        .from('contact_photos')
        .insert({
          organization_id: payload.organizationId,
          contact_id: sanitizeUUID(payload.contactId),
          photo_url: sanitizeText(payload.photoUrl),
          category: payload.category,
          taken_at: payload.takenAt || null,
          notes: sanitizeText(payload.notes),
          uploaded_by: sanitizeUUID(payload.uploadedBy),
        })
        .select('*')
        .single();

      if (error) return { data: null, error };
      return { data: transform(data as DbContactPhoto), error: null };
    } catch (e) {
      return { data: null, error: e as Error };
    }
  },
};
