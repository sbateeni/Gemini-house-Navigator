
import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import { MapNote, UserProfile } from '../types';

export function useNotes(session: any, isApproved: boolean, isAccountDeleted: boolean, userProfile: UserProfile | null) {
  const [notes, setNotes] = useState<MapNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [isConnected, setIsConnected] = useState(true); // Default to true, only set false on confirmed error
  const [tableMissing, setTableMissing] = useState(false);

  // Sync function
  const refreshNotes = async () => {
      // If we are waiting for profile but not source, don't fetch yet
      // BUT if we are source (session provided but no profile yet?), wait.
      // Actually source logic is handled in App.tsx manually for initial load.
      // This hook handles *updates*.
      
      if (!userProfile) return; // Wait for profile for standard users

      try {
        const savedNotes = await db.getAllNotes(userProfile);
        setNotes(savedNotes);
        setIsConnected(true);
      } catch (error: any) {
        console.error("Failed to fetch notes:", error);
        
        if (error.code === 'TABLE_MISSING') {
            setTableMissing(true);
        } else if (error.message === 'Offline') {
            // Explicit offline from DB service
            setIsConnected(false);
        } else if (error.message?.includes('fetch') || error.name === 'TypeError') {
            // Network fetch error
            setIsConnected(false);
        }
        // Ignore other errors (like RLS) for "isConnected" status
      } finally {
        setLoadingNotes(false);
      }
  };

  useEffect(() => {
    if (!session || !isApproved || isAccountDeleted || !userProfile) return;

    // Initial load
    refreshNotes();

    // Setup Online Listener for Auto-Sync
    const handleOnline = async () => {
        console.log("Network restored. Syncing...");
        setIsConnected(true);
        await db.syncPendingNotes();
        await refreshNotes();
    };

    const handleOffline = () => {
        setIsConnected(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Setup Supabase Realtime (Only works when online)
    const notesChannel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'notes' },
        () => { refreshNotes(); }
      )
      .subscribe((status) => {
          if (status === 'SUBSCRIBED') setIsConnected(true);
          // Don't mark offline immediately on CHANNEL_ERROR, just retry silently
      });

    return () => {
       supabase.removeChannel(notesChannel);
       window.removeEventListener('online', handleOnline);
       window.removeEventListener('offline', handleOffline);
    };

  }, [session, isApproved, isAccountDeleted, userProfile?.id]); // Depend on Profile ID

  const addNote = async (note: MapNote) => {
    // Optimistic UI update
    setNotes(prev => [note, ...prev]);
    
    try {
      await db.addNote(note);
      if (navigator.onLine && !isConnected) setIsConnected(true);
    } catch (e) {
      console.warn("Saved to offline queue");
    }
  };

  const updateNote = async (updatedNote: MapNote) => {
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
    await db.addNote(updatedNote); // Reuse upsert
  };

  const deleteNote = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    await db.deleteNote(id);
  };

  const updateStatus = async (id: string, status: 'caught' | 'not_caught') => {
    const note = notes.find(n => n.id === id);
    if (note) {
      await updateNote({ ...note, status });
    }
  };

  return {
    notes,
    loadingNotes,
    isConnected,
    tableMissing,
    addNote,
    updateNote,
    deleteNote,
    updateStatus,
    setNotes,
    setIsConnected
  };
}
