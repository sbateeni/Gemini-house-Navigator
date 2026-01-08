
import { supabase } from './supabase';
import { MapNote, UserProfile, UserPermissions, Assignment, LogEntry, AccessCode, ActiveCampaign } from '../types';

const DEFAULT_PERMISSIONS: UserPermissions = {
  can_create: true,
  can_see_others: true,
  can_navigate: true,
  can_edit_users: false,
  can_dispatch: false,
  can_view_logs: true,
  can_manage_content: false 
};

const CACHE_KEY_NOTES = 'gemini_offline_notes';
const CACHE_KEY_PENDING_NOTES = 'gemini_pending_notes';

// Define Numeric Ranks for visibility comparison
const ROLE_RANKS: Record<string, number> = {
  super_admin: 100,
  admin: 90,
  governorate_admin: 80,
  center_admin: 70,
  judicial: 65, 
  officer: 60,
  user: 50,
  source: 0, 
  banned: 0
};

const getRankValue = (role?: string) => ROLE_RANKS[role || 'user'] || 10;

const safeString = (val: any, fallback: string = ''): string => {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return fallback;
};

const getDeviceId = () => {
    let id = localStorage.getItem('gemini_device_id');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('gemini_device_id', id);
    }
    return id;
};

export const db = {
  // --- OFFLINE SYNC LOGIC ---
  async syncPendingNotes() {
    if (!navigator.onLine) return;
    
    const pendingJson = localStorage.getItem(CACHE_KEY_PENDING_NOTES);
    if (!pendingJson) return;

    const pendingNotes: MapNote[] = JSON.parse(pendingJson);
    if (pendingNotes.length === 0) return;

    for (const note of pendingNotes) {
      try {
        await this.addNote(note, true);
      } catch (e) {
        console.error("Failed to sync note", note.id, e);
      }
    }
    localStorage.removeItem(CACHE_KEY_PENDING_NOTES);
  },

  // --- SOURCE ACCESS LOGIC ---
  async verifyAccessCode(code: string): Promise<{ valid: boolean, error?: string, expiresAt?: number, label?: string }> {
     try {
         const deviceId = getDeviceId();
         const { data, error } = await supabase.rpc('claim_access_code', {
             p_code: code,
             p_device_id: deviceId
         });

         if (error) {
             if (error.code === 'PGRST202' || error.code === '42883') { 
                 const e: any = new Error("Database Schema Missing");
                 e.code = 'TABLE_MISSING';
                 throw e;
             }
             return { valid: false, error: 'خطأ في الاتصال بقاعدة البيانات' };
         }

         if (data && data.success) {
             return { valid: true, expiresAt: data.expires_at, label: data.label };
         } else {
             return { valid: false, error: data?.message || 'كود غير صالح' };
         }
     } catch (e: any) {
         if (e.code === 'TABLE_MISSING') throw e;
         return { valid: false, error: 'خطأ في النظام' };
     }
  },

  // --- CORE FUNCTIONS ---
  async getAllNotes(currentUserProfile?: UserProfile, sourceCode?: string): Promise<MapNote[]> {
    try {
      if (!navigator.onLine) throw new Error("Offline");

      // إعداد كود المصدر في جلسة Postgres لتفعيل الـ RLS بشكل صحيح
      if (sourceCode) {
          await supabase.rpc('set_source_context', { p_code: sourceCode });
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notes = (data || []).map((row: any) => ({
        id: row.id,
        lat: row.lat,
        lng: row.lng,
        userNote: safeString(row.user_note),
        locationName: safeString(row.location_name, 'موقع'),
        aiAnalysis: safeString(row.ai_analysis),
        createdAt: row.created_at,
        status: row.status,
        sources: row.sources,
        governorate: row.governorate,
        center: row.center,
        createdBy: row.created_by,
        accessCode: row.access_code,
        visibility: row.visibility
      })) as MapNote[];

      localStorage.setItem(CACHE_KEY_NOTES, JSON.stringify(notes));
      return notes;

    } catch (error: any) {
      if (error.code === 'TABLE_MISSING') throw error;
      const cached = localStorage.getItem(CACHE_KEY_NOTES);
      return cached ? JSON.parse(cached) : [];
    }
  },

  async addNote(note: MapNote, forceOnline = false): Promise<void> {
    if (note.accessCode) {
        const { error } = await supabase.rpc('create_source_note', {
            p_code: note.accessCode,
            p_note_data: { ...note, device_id: getDeviceId() }
        });
        if (error) throw error;
        return;
    }

    if (!navigator.onLine && !forceOnline) {
      const pending = JSON.parse(localStorage.getItem(CACHE_KEY_PENDING_NOTES) || '[]');
      pending.push(note);
      localStorage.setItem(CACHE_KEY_PENDING_NOTES, JSON.stringify(pending));
      return; 
    }

    const { data: { user } } = await supabase.auth.getUser();
    const dbRow = {
      id: note.id,
      lat: note.lat,
      lng: note.lng,
      user_note: note.userNote,
      location_name: note.locationName,
      ai_analysis: note.aiAnalysis,
      created_at: note.createdAt,
      status: note.status || 'not_caught',
      sources: note.sources || [],
      governorate: note.governorate, 
      center: note.center,
      created_by: user?.id,
      visibility: note.visibility || 'private'
    };

    const { error } = await supabase.from('notes').upsert(dbRow);
    if (error) throw error;
  },

  async deleteNote(id: string): Promise<void> {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;
  },

  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (error) return null; 
    return {
      id: data.id,
      username: safeString(data.username, 'User'),
      role: data.role,
      isApproved: data.is_approved === true,
      email: safeString(data.email),
      permissions: { ...DEFAULT_PERMISSIONS, ...(data.permissions || {}) },
      governorate: data.governorate,
      center: data.center,
      last_seen: data.last_seen
    };
  },

  async getAllProfiles(currentUserProfile?: UserProfile): Promise<UserProfile[]> {
    const { data, error } = await supabase.from('profiles').select('*').order('role', { ascending: true });
    if (error) throw error;
    return (data || []).map((row: any) => ({
      id: row.id,
      username: safeString(row.username, 'User'),
      role: row.role,
      isApproved: row.is_approved === true,
      email: safeString(row.email),
      permissions: { ...DEFAULT_PERMISSIONS, ...(row.permissions || {}) },
      governorate: row.governorate,
      center: row.center,
      last_seen: row.last_seen
    }));
  },

  async updateLastSeen(userId: string, lat?: number, lng?: number): Promise<void> {
      const updates: any = { last_seen: Date.now() };
      if (lat !== undefined) updates.lat = lat;
      if (lng !== undefined) updates.lng = lng;
      await supabase.from('profiles').update(updates).eq('id', userId);
  },

  async createLogEntry(log: Omit<LogEntry, 'id'>): Promise<void> {
    const row = {
      message: log.message,
      type: log.type,
      user_id: log.userId,
      timestamp: log.timestamp,
      governorate: log.governorate,
      center: log.center
    };
    await supabase.from('logs').insert(row);
  },

  async getRecentLogs(): Promise<LogEntry[]> {
    const { data, error } = await supabase.from('logs').select('*').order('timestamp', { ascending: false }).limit(50);
    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      message: safeString(row.message),
      type: row.type,
      userId: row.user_id,
      timestamp: row.timestamp,
      governorate: row.governorate,
      center: row.center
    }));
  },

  async clearAllLogs(): Promise<void> {
    const { error } = await supabase.from('logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  },

  async createCampaign(campaign: Omit<ActiveCampaign, 'id'>): Promise<void> {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('campaigns').insert({
          name: campaign.name,
          participants: Array.from(campaign.participantIds),
          targets: Array.from(campaign.targetIds),
          commanders: Array.from(campaign.commanderIds),
          start_time: campaign.startTime,
          is_active: true,
          created_by: user?.id
      });
      if (error) throw error;
  },

  async getActiveCampaign(): Promise<ActiveCampaign | null> {
      const { data, error } = await supabase.from('campaigns').select('*').eq('is_active', true).limit(1).maybeSingle();
      if (error || !data) return null;
      return {
          id: data.id,
          name: data.name,
          participantIds: new Set(data.participants || []),
          targetIds: new Set(data.targets || []),
          commanderIds: new Set(data.commanders || []),
          startTime: data.start_time,
          createdBy: data.created_by
      };
  },

  async endCampaign(id: string): Promise<void> {
      await supabase.from('campaigns').update({ is_active: false }).eq('id', id);
  },

  async updateCampaign(id: string, updates: any): Promise<void> {
      const dbUpdates: any = {};
      if (updates.targetIds) dbUpdates.targets = Array.from(updates.targetIds);
      await supabase.from('campaigns').update(dbUpdates).eq('id', id);
  },

  async getRecentlyActiveUsers(): Promise<any[]> {
    const cutoff = Date.now() - (30 * 60 * 1000);
    const { data } = await supabase.from('profiles').select('*').gt('last_seen', cutoff);
    return data || [];
  },

  async updateProfile(id: string, updates: any): Promise<void> {
      await supabase.from('profiles').update(updates).eq('id', id);
  },

  async createAssignment(assignment: any): Promise<void> {
    await supabase.from('assignments').insert({
        target_user_id: assignment.targetUserId,
        location_id: assignment.locationId,
        location_name: assignment.locationName,
        lat: assignment.lat,
        lng: assignment.lng,
        instructions: assignment.instructions,
        created_by: assignment.createdBy,
        created_at: Date.now()
    });
  },

  async getMyAssignments(userId: string): Promise<Assignment[]> {
    const { data } = await supabase.from('assignments').select('*').eq('target_user_id', userId).neq('status', 'completed');
    return (data || []).map((row: any) => ({
        id: row.id,
        targetUserId: row.target_user_id,
        locationId: row.location_id,
        locationName: row.location_name,
        lat: row.lat,
        lng: row.lng,
        instructions: row.instructions,
        status: row.status,
        createdBy: row.created_by,
        createdAt: row.created_at
    }));
  },

  async updateAssignmentStatus(id: string, status: string): Promise<void> {
      await supabase.from('assignments').update({ status }).eq('id', id);
  },

  async createAccessCode(label: string): Promise<AccessCode> {
      const code = Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
      const { data: { user } } = await supabase.auth.getUser();
      const newCode = {
          code,
          created_by: user?.id,
          created_at: Date.now(),
          expires_at: Date.now() + (30 * 60 * 1000),
          is_active: true,
          label
      };
      await supabase.from('access_codes').insert(newCode);
      return newCode as any;
  },

  async getMyAccessCodes(): Promise<AccessCode[]> {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('access_codes').select('*').eq('created_by', user?.id);
      return data || [];
  },

  async revokeAccessCode(code: string): Promise<void> {
      await supabase.from('access_codes').delete().eq('code', code);
  },

  async renewAccessCode(code: string): Promise<void> {
      await supabase.from('access_codes').update({ expires_at: Date.now() + (30 * 60 * 1000) }).eq('code', code);
  },

  async getAllAccessCodes(): Promise<AccessCode[]> {
      const { data } = await supabase.from('access_codes').select('*');
      return data || [];
  }
};
