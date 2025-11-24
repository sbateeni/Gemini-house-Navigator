import { supabase } from './supabase';
import { MapNote } from '../types';

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
      // Use JSON.stringify to ensure the full error object is visible in the console
      console.error("Error fetching notes from Supabase:", JSON.stringify(error, null, 2));
      // Throw error so App.tsx knows the connection failed
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
  }
};