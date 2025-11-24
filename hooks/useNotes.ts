import { useState, useEffect } from 'react';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import { MapNote } from '../types';

export function useNotes(session: any, isApproved: boolean, isAccountDeleted: boolean) {
  const [notes, setNotes] = useState<MapNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    if (!session || !isApproved || isAccountDeleted) return;

    const initData = async () => {
      try {
        const savedNotes = await db.getAllNotes();
        setNotes(savedNotes);
        setIsConnected(true);
      } catch (error: any) {
        if (error.code === 'TABLE_MISSING') {
            setTableMissing(true);
        } else {
            console.error("Failed to load notes", error);
            setIsConnected(false);
        }
      } finally {
        setLoadingNotes(false);
      }
    };
    initData();

    const notesChannel = supabase
      .channel('notes-changes')
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'notes' },
        () => { initData(); }
      )
      .subscribe();

    return () => {
       supabase.removeChannel(notesChannel);
    };

  }, [session, isApproved, isAccountDeleted]);

  const addNote = async (note: MapNote) => {
    await db.addNote(note);
    setNotes(prev => [note, ...prev]);
    if (!isConnected) setIsConnected(true);
  };

  const updateNote = async (updatedNote: MapNote) => {
    await db.addNote(updatedNote);
    setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
  };

  const deleteNote = async (id: string) => {
    await db.deleteNote(id);
    setNotes(prev => prev.filter(n => n.id !== id));
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
    setNotes, // Exposed for manual updates if needed
    setIsConnected
  };
}