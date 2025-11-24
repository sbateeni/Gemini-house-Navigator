
import { supabase } from './supabase';
import { MapNote, UserProfile, UserPermissions, Assignment } from '../types';

const DEFAULT_PERMISSIONS: UserPermissions = {
  can_create: true,
  can_see_others: true,
  can_navigate: true
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
    
    // Process sync sequentially
    for (const note of pendingNotes) {
      try {
        await this.addNote(note, true); // true = force online save
      } catch (e) {
        console.error("Failed to sync note", note.id, e);
      }
    }

    // Clear queue
    localStorage.removeItem(CACHE_KEY_PENDING_NOTES);
    // Refresh cache
    await this.getAllNotes();
  },

  // --- CORE FUNCTIONS ---

  async getAllNotes(): Promise<MapNote[]> {
    // 1. Try to fetch from Supabase
    try {
      if (!navigator.onLine) throw new Error("Offline");

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

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
        sources: row.sources
      })) as MapNote[];

      // Cache successful response
      localStorage.setItem(CACHE_KEY_NOTES, JSON.stringify(notes));
      
      return notes;

    } catch (error: any) {
      // 2. Fallback to Local Cache
      console.warn("Fetching failed or offline, loading from cache...", error);
      const cached = localStorage.getItem(CACHE_KEY_NOTES);
      
      if (cached) {
        const localNotes = JSON.parse(cached);
        // Also merge any pending offline notes for display
        const pending = JSON.parse(localStorage.getItem(CACHE_KEY_PENDING_NOTES) || '[]');
        return [...pending, ...localNotes];
      }

      if (error.message === "Offline") throw error; // Allow UI to know we are purely offline
      
      if (error.code === 'PGRST205' || error.code === '42P01') {
        const missingError: any = new Error('Table Missing');
        missingError.code = 'TABLE_MISSING';
        throw missingError;
      }
      throw error;
    }
  },

  async addNote(note: MapNote, forceOnline = false): Promise<void> {
    // Offline Check
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
        sources: note.sources || []
      };

      const { error } = await supabase.from('notes').upsert(dbRow);
      if (error) throw error;
      
    } catch (error: any) {
      console.error("Error saving note:", JSON.stringify(error, null, 2));
      // If error is network related, save to pending
      if (!navigator.onLine || error.message?.includes('fetch')) {
         const pending = JSON.parse(localStorage.getItem(CACHE_KEY_PENDING_NOTES) || '[]');
         // Avoid duplicates
         if (!pending.find((n: MapNote) => n.id === note.id)) {
            pending.push(note);
            localStorage.setItem(CACHE_KEY_PENDING_NOTES, JSON.stringify(pending));
         }
      }
      throw error;
    }
  },

  async deleteNote(id: string): Promise<void> {
    if (!navigator.onLine) {
        throw new Error("Cannot delete notes while offline.");
    }
    try {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    } catch (error: any) {
      console.error("Error deleting note", error);
      throw error;
    }
  },

  // Get User Profile (Role & Approval)
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
        permissions: data.permissions || DEFAULT_PERMISSIONS
      };
    } catch (error) {
      return null;
    }
  },

  // Admin: Get All Profiles
  async getAllProfiles(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: true }); 

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        username: row.username,
        role: row.role,
        isApproved: row.is_approved === true,
        email: row.email,
        permissions: row.permissions || DEFAULT_PERMISSIONS
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

      const { error } = await supabase.from('profiles').update(dbUpdates).eq('id', id);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  },

  async createAssignment(assignment: Omit<Assignment, 'id' | 'createdAt' | 'status'>): Promise<void> {
    try {
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
    } catch (error) {
      throw error;
    }
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
    } catch (error) {
      return [];
    }
  },

  async updateAssignmentStatus(id: string, status: 'accepted' | 'completed'): Promise<void> {
    try {
      const { error } = await supabase.from('assignments').update({ status }).eq('id', id);
      if (error) throw error;
    } catch (error) {
      throw error;
    }
  }
};
