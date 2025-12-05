
import { supabase } from './supabase';
import { MapNote, UserProfile, UserPermissions, Assignment, LogEntry, AccessCode } from '../types';

const DEFAULT_PERMISSIONS: UserPermissions = {
  can_create: true,
  can_see_others: true,
  can_navigate: true,
  can_edit_users: false,
  can_dispatch: false,
  can_view_logs: true
};

const CACHE_KEY_NOTES = 'gemini_offline_notes';
const CACHE_KEY_PENDING_NOTES = 'gemini_pending_notes';

// Define Numeric Ranks for visibility comparison
const ROLE_RANKS: Record<string, number> = {
  super_admin: 100,
  admin: 90,
  governorate_admin: 80,
  center_admin: 70,
  officer: 60,
  user: 50,
  source: 0, // Sources have lowest rank
  banned: 0
};

const getRankValue = (role?: string) => ROLE_RANKS[role || 'user'] || 10;

// Helper to ensure string type
const safeString = (val: any, fallback: string = ''): string => {
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  return fallback;
};

// Helper to get or create a unique Device ID for this browser
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

    console.log(`Syncing ${pendingNotes.length} offline notes...`);
    
    const failedNotes: MapNote[] = [];

    for (const note of pendingNotes) {
      try {
        await this.addNote(note, true);
      } catch (e) {
        console.error("Failed to sync note", note.id, e);
        failedNotes.push(note);
      }
    }

    if (failedNotes.length > 0) {
        console.warn(`${failedNotes.length} notes failed to sync and remain in queue.`);
        localStorage.setItem(CACHE_KEY_PENDING_NOTES, JSON.stringify(failedNotes));
    } else {
        console.log("All pending notes synced successfully.");
        localStorage.removeItem(CACHE_KEY_PENDING_NOTES);
    }
  },

  // --- SOURCE ACCESS LOGIC ---
  
  // Verify access code using secure RPC with Device Binding
  async verifyAccessCode(code: string): Promise<{ valid: boolean, error?: string, expiresAt?: number, label?: string }> {
     try {
         const deviceId = getDeviceId();
         
         // Call RPC to check code and bind to this device ID
         const { data, error } = await supabase.rpc('claim_access_code', {
             p_code: code,
             p_device_id: deviceId
         });

         if (error) {
             console.error("RPC Error (claim_access_code)", error);
             if (error.code === 'PGRST202' || error.message?.includes('function claim_access_code') || error.code === '42883') { 
                 const e: any = new Error("Database Schema Missing");
                 e.code = 'TABLE_MISSING';
                 throw e;
             }
             return { valid: false, error: 'خطأ في الاتصال بقاعدة البيانات' };
         }

         // RPC returns: { success: boolean, message?: string, expires_at?: number, label?: string }
         if (data && data.success) {
             return { valid: true, expiresAt: data.expires_at, label: data.label };
         } else {
             return { valid: false, error: data?.message || 'كود غير صالح أو مستخدم على جهاز آخر' };
         }
     } catch (e: any) {
         if (e.code === 'TABLE_MISSING') throw e;
         return { valid: false, error: 'خطأ في النظام' };
     }
  },

  // Generate new code (Officer+)
  async createAccessCode(label: string): Promise<AccessCode> {
      // 16-digit numeric string
      const code = Math.floor(1000000000000000 + Math.random() * 9000000000000000).toString();
      const createdAt = Date.now();
      const expiresAt = createdAt + (30 * 60 * 1000); // 30 mins

      const { data: { user } } = await supabase.auth.getUser();

      const newCode: AccessCode = {
          code,
          created_by: user?.id || '',
          created_at: createdAt,
          expires_at: expiresAt,
          is_active: true,
          label: safeString(label)
      };

      const { error } = await supabase.from('access_codes').insert(newCode);
      if (error) throw error;
      return newCode;
  },

  async renewAccessCode(code: string): Promise<void> {
      const expiresAt = Date.now() + (30 * 60 * 1000); // +30 mins
      const { error } = await supabase
        .from('access_codes')
        .update({ is_active: true, expires_at: expiresAt })
        .eq('code', code);
      if (error) throw error;
  },

  // Get active codes created by me
  async getMyAccessCodes(): Promise<AccessCode[]> {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data } = await supabase
        .from('access_codes')
        .select('*')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
        
      return (data || []).map((row: any) => ({
          ...row,
          label: safeString(row.label)
      }));
  },

  // SUPER ADMIN: Get ALL codes
  async getAllAccessCodes(): Promise<AccessCode[]> {
      const { data } = await supabase
        .from('access_codes')
        .select('*')
        .order('created_at', { ascending: false });

      return (data || []).map((row: any) => ({
          ...row,
          label: safeString(row.label)
      }));
  },

  // Revoke code (HARD DELETE)
  async revokeAccessCode(code: string): Promise<void> {
      const { error } = await supabase
        .from('access_codes')
        .delete()
        .eq('code', code);
      if (error) throw error;
  },


  // --- CORE FUNCTIONS ---

  async getAllNotes(currentUserProfile?: UserProfile, sourceCode?: string): Promise<MapNote[]> {
    try {
      if (!navigator.onLine) throw new Error("Offline");

      // CASE 1: Source Login (Guest)
      if (sourceCode) {
          // Fetch notes created by this code OR public notes
          // We use 'or' filter
          const { data, error } = await supabase
             .from('notes')
             .select('*')
             .or(`access_code.eq.${sourceCode},visibility.eq.public`); 
          
          if (error) throw error;
          
          return (data || []).map((row: any) => ({
             id: row.id,
             lat: row.lat,
             lng: row.lng,
             userNote: safeString(row.user_note),
             locationName: safeString(row.location_name, 'Unknown'),
             aiAnalysis: safeString(row.ai_analysis),
             createdAt: row.created_at,
             status: row.status,
             sources: row.sources,
             accessCode: row.access_code,
             visibility: row.visibility
          }));
      }

      // CASE 2: Authenticated User
      // Fetch directly from notes without joining profiles to avoid foreign key issues
      let query = supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      const currentRank = getRankValue(currentUserProfile?.role);
      const currentUserId = currentUserProfile?.id;

      const filteredData = (data || []).filter((row: any) => {
          // Public is always visible
          if (row.visibility === 'public') return true;
          // Always see my own notes
          if (row.created_by === currentUserId) return true;
          // If note is from a "Source", Officers+ can see it
          if (row.access_code) {
             return currentRank >= getRankValue('user');
          }
          return true;
      });

      const notes = filteredData.map((row: any) => ({
        id: row.id,
        lat: row.lat,
        lng: row.lng,
        userNote: safeString(row.user_note),
        locationName: safeString(row.location_name, 'Unknown Location'),
        aiAnalysis: safeString(row.ai_analysis),
        createdAt: row.created_at,
        status: row.status,
        sources: row.sources,
        governorate: safeString(row.governorate, undefined),
        center: safeString(row.center, undefined),
        createdBy: row.created_by,
        accessCode: row.access_code,
        visibility: row.visibility
      })) as MapNote[];

      localStorage.setItem(CACHE_KEY_NOTES, JSON.stringify(notes));
      return notes;

    } catch (error: any) {
      console.warn("Fetching failed or offline", error);
      if (error.code === 'PGRST205' || error.code === '42P01' || error.code === '42703' || error.code === 'TABLE_MISSING') {
        const missingError: any = new Error('Table/Column Missing');
        missingError.code = 'TABLE_MISSING';
        throw missingError;
      }
      
      const cached = localStorage.getItem(CACHE_KEY_NOTES);
      if (cached) {
        const localNotes = JSON.parse(cached);
        const pending = JSON.parse(localStorage.getItem(CACHE_KEY_PENDING_NOTES) || '[]');
        return [...pending, ...localNotes];
      }
      if (error.message === "Offline") throw error;
      throw error;
    }
  },

  async addNote(note: MapNote, forceOnline = false): Promise<void> {
    // Check if this is a "Source" note
    if (note.accessCode) {
        const { error } = await supabase.rpc('create_source_note', {
            p_code: note.accessCode,
            p_note_data: note
        });
        if (error) {
             console.error("RPC Error", error);
             throw error;
        }
        return;
    }

    // Standard User Logic
    if (!navigator.onLine && !forceOnline) {
      console.log("Offline: Saving note to pending queue");
      const pending = JSON.parse(localStorage.getItem(CACHE_KEY_PENDING_NOTES) || '[]');
      pending.push(note);
      localStorage.setItem(CACHE_KEY_PENDING_NOTES, JSON.stringify(pending));
      return; 
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const dbRow = {
        id: note.id,
        lat: note.lat,
        lng: note.lng,
        user_note: note.userNote,
        location_name: note.locationName,
        ai_analysis: note.aiAnalysis,
        created_at: note.createdAt,
        status: note.status || null,
        sources: note.sources || [],
        governorate: note.governorate, 
        center: note.center,
        created_by: user?.id,
        visibility: note.visibility || 'private'
      };

      const { error } = await supabase.from('notes').upsert(dbRow);
      if (error) {
        if (error.code === '42703') throw new Error("DATABASE_SCHEMA_MISMATCH");
        throw error;
      }
      
    } catch (error: any) {
      console.error("Error saving note:", JSON.stringify(error, null, 2));
      if (error.message === "DATABASE_SCHEMA_MISMATCH" || error.code === '42703') {
          alert("خطأ: قاعدة البيانات تحتاج لتحديث (Missing Column).");
          const schemaError: any = new Error('Database Schema Mismatch');
          schemaError.code = 'TABLE_MISSING';
          throw schemaError;
      }

      if (!navigator.onLine || error.message?.includes('fetch')) {
         const pending = JSON.parse(localStorage.getItem(CACHE_KEY_PENDING_NOTES) || '[]');
         if (!pending.find((n: MapNote) => n.id === note.id)) {
            pending.push(note);
            localStorage.setItem(CACHE_KEY_PENDING_NOTES, JSON.stringify(pending));
         }
      }
      throw error;
    }
  },

  async deleteNote(id: string): Promise<void> {
    if (!navigator.onLine) throw new Error("Cannot delete notes while offline.");
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) throw error;
  },

  // Get User Profile
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) return null; 
      
      return {
        id: data.id,
        username: safeString(data.username, 'User'),
        role: data.role,
        isApproved: data.is_approved === true,
        email: safeString(data.email),
        permissions: { ...DEFAULT_PERMISSIONS, ...(data.permissions || {}) },
        governorate: safeString(data.governorate, undefined),
        center: safeString(data.center, undefined),
        last_seen: data.last_seen
      };
    } catch (error) {
      return null;
    }
  },

  // Admin: Get All Profiles (Filtered by Rank)
  async getAllProfiles(currentUserProfile?: UserProfile): Promise<UserProfile[]> {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true });

      if (currentUserProfile) {
        const role = currentUserProfile.role;
        if (role === 'super_admin' || role === 'admin') {
           // No filter
        }
        else if (role === 'governorate_admin' && currentUserProfile.governorate) {
           query = query.or(`governorate.eq.${currentUserProfile.governorate},governorate.is.null`);
        } 
        else if (role === 'center_admin' && currentUserProfile.center) {
           query = query.eq('center', currentUserProfile.center);
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        username: safeString(row.username, 'User'),
        role: row.role,
        isApproved: row.is_approved === true,
        email: safeString(row.email),
        permissions: { ...DEFAULT_PERMISSIONS, ...(row.permissions || {}) },
        governorate: safeString(row.governorate, undefined),
        center: safeString(row.center, undefined),
        last_seen: row.last_seen
      }));
    } catch (error) {
      return [];
    }
  },

  async getRecentlyActiveUsers(minutes: number = 20): Promise<any[]> {
    try {
      const cutoff = Date.now() - (minutes * 60 * 1000);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, last_seen, lat, lng, role')
        .gt('last_seen', cutoff)
        .not('lat', 'is', null)
        .not('lng', 'is', null);

      if (error) return [];
      
      return (data || []).map((row: any) => ({
          ...row,
          username: safeString(row.username, 'User')
      }));
    } catch {
      return [];
    }
  },

  async updateProfile(id: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const dbUpdates: any = {};
      if (updates.role) dbUpdates.role = updates.role;
      if (updates.isApproved !== undefined) dbUpdates.is_approved = updates.isApproved;
      if (updates.permissions) dbUpdates.permissions = updates.permissions;
      if (updates.governorate !== undefined) dbUpdates.governorate = updates.governorate;
      if (updates.center !== undefined) dbUpdates.center = updates.center;

      const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },

  async updateLastSeen(userId: string, lat?: number, lng?: number): Promise<void> {
      const updates: any = { last_seen: Date.now() };
      if (lat !== undefined) updates.lat = lat;
      if (lng !== undefined) updates.lng = lng;
      
      await supabase.from('profiles').update(updates).eq('id', userId);
  },

  async createAssignment(assignment: Omit<Assignment, 'id' | 'createdAt' | 'status'>): Promise<void> {
    const { error } = await supabase.from('assignments').insert({
        target_user_id: assignment.targetUserId,
        location_id: assignment.locationId,
        location_name: assignment.locationName,
        lat: assignment.lat,
        lng: assignment.lng,
        instructions: assignment.instructions,
        created_by: assignment.createdBy,
        created_at: Date.now(),
        status: 'pending'
    });
    if (error) throw error;
  },

  async getMyAssignments(userId: string): Promise<Assignment[]> {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('target_user_id', userId)
        .neq('status', 'completed')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      return (data || []).map((row: any) => ({
        id: row.id,
        targetUserId: row.target_user_id,
        locationId: row.location_id,
        locationName: safeString(row.location_name, 'Assignment'),
        lat: row.lat,
        lng: row.lng,
        instructions: safeString(row.instructions),
        status: row.status,
        createdBy: row.created_by,
        createdAt: row.created_at
      }));
    } catch (e) {
      return [];
    }
  },

  async updateAssignmentStatus(id: string, status: 'accepted' | 'completed'): Promise<void> {
    const { error } = await supabase.from('assignments').update({ status }).eq('id', id);
    if (error) throw error;
  },

  async createLogEntry(log: Omit<LogEntry, 'id'>): Promise<void> {
    try {
      const row: any = {
        message: log.message,
        type: log.type,
        user_id: log.userId,
        timestamp: log.timestamp,
        governorate: log.governorate
      };
      if (log.center) row.center = log.center;

      await supabase.from('logs').insert(row);
    } catch (e) {
      console.error("Log failed", e);
    }
  },

  async getRecentLogs(): Promise<LogEntry[]> {
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(50);

      if (error) {
          if (error.code === 'PGRST205' || error.code === '42P01') return [];
          throw error;
      }
      
      return (data || []).map((row: any) => ({
        id: row.id,
        message: safeString(row.message, 'Log'),
        type: row.type,
        userId: row.user_id,
        timestamp: row.timestamp,
        governorate: safeString(row.governorate, undefined),
        center: safeString(row.center, undefined)
      }));
    } catch {
      return [];
    }
  },

  async clearAllLogs(): Promise<void> {
    if (!navigator.onLine) throw new Error("Cannot clear logs while offline.");
    const { error } = await supabase.from('logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  }
};
