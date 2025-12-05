
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

// Define Numeric Ranks for visibility comparison
// Higher number = Higher Rank
const ROLE_RANKS: Record<string, number> = {
  super_admin: 100,
  admin: 90,
  governorate_admin: 80,
  center_admin: 70,
  officer: 60,
  user: 50,
  banned: 0
};

const getRankValue = (role?: string) => ROLE_RANKS[role || 'user'] || 10;

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

      // 1. Start with basic hierarchy filtering (Governorate/Center)
      let query = supabase
        .from('notes')
        .select(`
            *,
            creator_profile:created_by ( role )
        `)
        .order('created_at', { ascending: false });

      // Apply Hierarchical Filters (Scope-based)
      if (currentUserProfile) {
        const role = currentUserProfile.role;
        // Super Admin (and legacy admin) sees ALL scopes
        if (role === 'super_admin' || role === 'admin') {
           // No scope filter
        } 
        // Governorate Admin sees ONLY their governorate
        else if (role === 'governorate_admin' && currentUserProfile.governorate) {
           query = query.eq('governorate', currentUserProfile.governorate);
        }
        // Center Admin/User sees ONLY their center notes (or Governorates if policy allows)
        else if ((role === 'center_admin' || role === 'user' || role === 'officer') && currentUserProfile.center) {
           query = query.eq('center', currentUserProfile.center);
        }
      }

      const { data, error } = await query;

      if (error) throw error;

      // 2. Apply Rank-Based Filtering (Visibility Logic)
      // Rule: Viewer Rank >= Creator Rank
      // "Higher rank sees lower. Lower rank DOES NOT see higher."
      const currentRank = getRankValue(currentUserProfile?.role);
      const currentUserId = currentUserProfile?.id;

      const filteredData = (data || []).filter((row: any) => {
          // Always see my own notes
          if (row.created_by === currentUserId) return true;

          // If no creator info (legacy notes), assume visible (or treat as lowest rank)
          if (!row.creator_profile) return true;

          const creatorRank = getRankValue(row.creator_profile.role);
          
          // I see notes if my rank is EQUAL or HIGHER than the creator's rank.
          return currentRank >= creatorRank;
      });

      const notes = filteredData.map((row: any) => ({
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
        center: row.center,
        createdBy: row.created_by
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
      // Get current user ID to stamp the note
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
        governorate: note.governorate, // Add Hierarchy Tags
        center: note.center,
        created_by: user?.id // SAVE OWNER
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
          alert("خطأ: قاعدة البيانات تحتاج لتحديث. الأعمدة (governorate, center, created_by) مفقودة.");
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

  // Updated to include fetching users active in the last X minutes
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
      return data || [];
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

  // Updated to save location data
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
  },

  async clearAllLogs(): Promise<void> {
    if (!navigator.onLine) throw new Error("Cannot clear logs while offline.");
    const { error } = await supabase.from('logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) throw error;
  }
};
