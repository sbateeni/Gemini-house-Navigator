import { supabase } from './supabase';
import { MapNote, UserProfile } from '../types';

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

  // Get User Profile (Role)
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) return null; // Profile might not exist yet if just signed up
      
      return data as UserProfile;
    } catch (error) {
      console.error("Error fetching profile", error);
      return null;
    }
  }
};