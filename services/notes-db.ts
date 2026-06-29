import { supabase } from './supabase';
import type { MapNote, UserProfile } from '../types';
import { normalizeWantedStatus, toLegacyWantedStatus } from '../utils/status';

const CACHE_KEY = 'ops_offline_notes';
const PENDING_KEY = 'ops_pending_notes';
const getDeviceId = () => {
  let id = localStorage.getItem('ops_device_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('ops_device_id', id); }
  return id;
};

const mapNote = (row: any): MapNote => ({
  id: row.id, lat: row.lat, lng: row.lng,
  userNote: row.user_note, locationName: row.location_name,
  aiAnalysis: row.ai_analysis, createdAt: row.created_at,
  status: normalizeWantedStatus(row.status), sources: row.sources,
  governorate: row.governorate, center: row.center,
  createdBy: row.created_by, accessCode: row.access_code, visibility: row.visibility
});

export const notesDb = {
  async syncPending() {
    if (!navigator.onLine) return;
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return;
    const pending: MapNote[] = JSON.parse(raw);
    for (const note of pending) {
      try { await this.add(note, true); } catch { /* skip */ }
    }
    localStorage.removeItem(PENDING_KEY);
  },

  async getAll(_currentUserProfile?: UserProfile, sourceCode?: string): Promise<MapNote[]> {
    try {
      if (!navigator.onLine) throw new Error('Offline');
      if (sourceCode) await supabase.rpc('set_source_context', { p_code: sourceCode });
      const { data, error } = await supabase.from('notes').select('*').order('created_at', { ascending: false });
      if (error) throw new Error('Access Denied');
      const notes = (data || []).map(mapNote);
      localStorage.setItem(CACHE_KEY, JSON.stringify(notes));
      return notes;
    } catch {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    }
  },

  async add(note: MapNote, forceOnline = false): Promise<void> {
    if (note.accessCode) {
      const { error } = await supabase.rpc('create_source_note', {
        p_code: note.accessCode, p_note_data: { ...note, device_id: getDeviceId() }
      });
      if (error) throw new Error('Unauthorized submission');
      return;
    }
    if (!navigator.onLine && !forceOnline) {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
      pending.push(note);
      localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required');
    const { error } = await supabase.from('notes').upsert({
      id: note.id, lat: note.lat, lng: note.lng,
      user_note: note.userNote, location_name: note.locationName,
      ai_analysis: note.aiAnalysis, created_at: note.createdAt,
      status: toLegacyWantedStatus(note.status), sources: note.sources || [],
      governorate: note.governorate, center: note.center,
      created_by: user.id, visibility: note.visibility || 'private'
    });
    if (error) throw new Error('Database integrity violation');
  },

  async remove(id: string): Promise<void> {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw new Error('Delete failed or unauthorized');
  }
};
