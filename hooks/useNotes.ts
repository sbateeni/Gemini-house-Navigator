
import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import { MapNote } from '../types';

export function useNotes(session: any, isApproved: boolean, isAccountDeleted: boolean) {
  const [notes, setNotes] = useState<MapNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  // Sync function
  const refreshNotes = async () => {
      try {
        const savedNotes = await db.getAllNotes();
        setNotes(savedNotes);
        setIsConnected(true);
      } catch (error: any) {
        if (error.code === 'TABLE_MISSING') {
            setTableMissing(true);
        } else {
            console.warn("Running in Offline Mode (Cache)");
            setIsConnected(false);
        }
      } finally {
        setLoadingNotes(false);
      }
  };

  useEffect(() => {
    if (!session || !isApproved || isAccountDeleted) return;

    // Initial load
    refreshNotes();

    // Setup Online Listener for Auto-Sync
    const handleOnline = async () => {
        console.log("Network restored. Syncing...");
        await db.syncPendingNotes();
        await refreshNotes();
        setIsConnected(true);
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
      .subscribe();

    return () => {
       supabase.removeChannel(notesChannel);
       window.removeEventListener('online', handleOnline);
       window.removeEventListener('offline', handleOffline);
    };

  }, [session, isApproved, isAccountDeleted]);

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
