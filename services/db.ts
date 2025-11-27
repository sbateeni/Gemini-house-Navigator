


import { supabase } from './supabase';
import { MapNote, UserProfile, UserPermissions, Assignment, LogEntry } from '../types';

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

  // --- CORE FUNCTIONS ---

  async getAllNotes(currentUserProfile?: UserProfile): Promise<MapNote[]> {
    try {
      if (!navigator.onLine) throw new Error("Offline");

      // Build Query based on Hierarchy
      let query = supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply Hierarchical Filters
      if (currentUserProfile) {
        const role = currentUserProfile.role;
        // Super Admin (and legacy admin) sees ALL
        if (role === 'super_admin' || role === 'admin') {
           // No filter - see everything
        } 
        // Governorate Admin sees ONLY their governorate
        else if (role === 'governorate_admin' && currentUserProfile.governorate) {
           query = query.eq('governorate', currentUserProfile.governorate);
        }
        // Center Admin/User sees ONLY their center notes (or Governorates if policy allows, but usually stricter)
        // Here we restrict center admins and users to their center for strict compartmentalization
        else if ((role === 'center_admin' || role === 'user') && currentUserProfile.center) {
           query = query.eq('center', currentUserProfile.center);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      const notes = (data || []).map((row: any) => ({
        id: row.id,
        lat: row.lat,
        lng: row.lng,
        userNote: row.user_note,
        locationName: row.location_name,
        aiAnalysis: row.ai_analysis,
        createdAt: row.created_at,
        status: row.status,
        sources: row.sources,
        governorate: row.governorate,
        center: row.center
      })) as MapNote[];

      localStorage.setItem(CACHE_KEY_NOTES, JSON.stringify(notes));
      
      return notes;

    } catch (error: any) {
      console.warn("Fetching failed or offline, loading from cache...", error);
      const cached = localStorage.getItem(CACHE_KEY_NOTES);
      
      if (cached) {
        const localNotes = JSON.parse(cached);
        const pending = JSON.parse(localStorage.getItem(CACHE_KEY_PENDING_NOTES) || '[]');
        return [...pending, ...localNotes];
      }

      if (error.message === "Offline") throw error;
      
      if (error.code === 'PGRST205' || error.code === '42P01') {
        const missingError: any = new Error('Table Missing');
        missingError.code = 'TABLE_MISSING';
        throw missingError;
      }
      throw error;
    }
  },

  async addNote(note: MapNote, forceOnline = false): Promise<void> {
    if (!navigator.onLine && !forceOnline) {
      console.log("Offline: Saving note to pending queue");
      const pending = JSON.parse(localStorage.getItem(CACHE_KEY_PENDING_NOTES) || '[]');
      pending.push(note);
      localStorage.setItem(CACHE_KEY_PENDING_NOTES, JSON.stringify(pending));
      return; 
    }

    try {
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
        governorate: note.governorate, // Add Hierarchy Tags
        center: note.center
      };

      const { error } = await supabase.from('notes').upsert(dbRow);
      if (error) {
        // Check for missing column error specifically
        if (error.code === '42703') { 
            throw new Error("DATABASE_SCHEMA_MISMATCH");
        }
        throw error;
      }
      
    } catch (error: any) {
      console.error("Error saving note:", JSON.stringify(error, null, 2));
      if (error.message === "DATABASE_SCHEMA_MISMATCH") {
          alert("خطأ: قاعدة البيانات تحتاج لتحديث. الأعمدة (governorate, center) مفقودة.");
          throw error;
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
        username: data.username,
        role: data.role,
        isApproved: data.is_approved === true,
        email: data.email,
        permissions: { ...DEFAULT_PERMISSIONS, ...(data.permissions || {}) },
        governorate: data.governorate,
        center: data.center,
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

      // Apply Filters
      if (currentUserProfile) {
        const role = currentUserProfile.role;
        
        // Super Admin (and legacy admin) sees all
        if (role === 'super_admin' || role === 'admin') {
           // No filter
        }
        // Governorate Admin sees users in their gov OR unassigned users (to assign them)
        else if (role === 'governorate_admin' && currentUserProfile.governorate) {
           query = query.or(`governorate.eq.${currentUserProfile.governorate},governorate.is.null`);
        } 
        // Center Admin sees users in their center
        else if (role === 'center_admin' && currentUserProfile.center) {
           query = query.eq('center', currentUserProfile.center);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        username: row.username,
        role: row.role,
        isApproved: row.is_approved === true,
        email: row.email,
        permissions: { ...DEFAULT_PERMISSIONS, ...(row.permissions || {}) },
        governorate: row.governorate,
        center: row.center,
        last_seen: row.last_seen
      }));
    } catch (error) {
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

  async updateLastSeen(userId: string): Promise<void> {
      await supabase.from('profiles').update({ last_seen: Date.now() }).eq('id', userId);
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
        locationName: row.location_name,
        lat: row.lat,
        lng: row.lng,
        instructions: row.instructions,
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

  // Logging
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
      // logs are best effort
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
          // If table missing, return empty to prevent crash
          if (error.code === 'PGRST205' || error.code === '42P01') return [];
          throw error;
      }
      
      return (data || []).map((row: any) => ({
        id: row.id,
        message: row.message,
        type: row.type,
        userId: row.user_id,
        timestamp: row.timestamp,
        governorate: row.governorate,
        center: row.center
      }));
    } catch {
      return [];
    }
  }
};
