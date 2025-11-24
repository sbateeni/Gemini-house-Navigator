
import { supabase } from './supabase';
import { MapNote, UserProfile, UserPermissions, Assignment } from '../types';

const DEFAULT_PERMISSIONS: UserPermissions = {
  can_create: true,
  can_see_others: true,
  can_navigate: true
};

export const db = {
  // Get all notes from Supabase
  async getAllNotes(): Promise<MapNote[]> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      // Map snake_case from DB to camelCase for App
      return (data || []).map((row: any) => ({
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

    } catch (error: any) {
      if (error.code === 'PGRST205' || error.code === '42P01') {
        const missingError: any = new Error('Table Missing');
        missingError.code = 'TABLE_MISSING';
        throw missingError;
      }
      console.error("Error fetching notes from Supabase:", JSON.stringify(error, null, 2));
      throw error;
    }
  },

  // Add or Update a note
  async addNote(note: MapNote): Promise<void> {
    try {
      // Map camelCase from App to snake_case for DB
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

      const { error } = await supabase
        .from('notes')
        .upsert(dbRow);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error("Error saving note to Supabase:", JSON.stringify(error, null, 2));
      throw error;
    }
  },

  // Delete a note
  async deleteNote(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error("Error deleting note from Supabase:", JSON.stringify(error, null, 2));
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
      console.error("Error fetching profile", error);
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
      console.error("Error fetching all profiles", error);
      return [];
    }
  },

  // Admin: Update Profile Role/Approval/Permissions
  async updateProfile(id: string, updates: Partial<UserProfile>): Promise<void> {
    try {
      const dbUpdates: any = {};
      if (updates.role) dbUpdates.role = updates.role;
      if (updates.isApproved !== undefined) dbUpdates.is_approved = updates.isApproved;
      if (updates.permissions) dbUpdates.permissions = updates.permissions;

      const { error } = await supabase
        .from('profiles')
        .update(dbUpdates)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating profile", error);
      throw error;
    }
  },

  // --- Assignments / Dispatch System ---

  async createAssignment(assignment: Omit<Assignment, 'id' | 'createdAt' | 'status'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('assignments')
        .insert({
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
      console.error("Error creating assignment", error);
      throw error;
    }
  },

  async getMyAssignments(userId: string): Promise<Assignment[]> {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select('*')
        .eq('target_user_id', userId)
        .neq('status', 'completed') // Only show pending/accepted
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
      console.error("Error fetching my assignments", error);
      return [];
    }
  },

  async updateAssignmentStatus(id: string, status: 'accepted' | 'completed'): Promise<void> {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    } catch (error) {
      console.error("Error updating assignment status", error);
      throw error;
    }
  }
};
