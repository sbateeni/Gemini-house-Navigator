import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { db as firestore } from './firebase';
import { MapNote } from '../types';

const COLLECTION_NAME = 'notes';

export const db = {
  // Get all notes from Firebase
  async getAllNotes(): Promise<MapNote[]> {
    try {
      const notesCol = collection(firestore, COLLECTION_NAME);
      const noteSnapshot = await getDocs(notesCol);
      const noteList = noteSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
           id: doc.id, // Use Firebase ID
           ...data
        } as MapNote;
      });
      // Sort locally for now
      return noteList.sort((a, b) => b.createdAt - a.createdAt);
    } catch (error) {
      console.error("Error fetching notes from Firebase:", error);
      return [];
    }
  },

  // Add or Update a note
  async addNote(note: MapNote): Promise<void> {
    try {
      // If the note has an ID that looks like a timestamp (from our old local creation logic),
      // we treat it as a new document but let's try to set a custom ID or let Firebase decide.
      // Strategy: We use setDoc if we want to preserve the ID, or addDoc if new.
      // To simplify: we use setDoc with the ID provided.
      
      const noteRef = doc(firestore, COLLECTION_NAME, note.id);
      
      // Ensure plain object for Firebase (remove any undefined values if necessary)
      const plainNote = JSON.parse(JSON.stringify(note));
      
      await setDoc(noteRef, plainNote);
    } catch (error) {
      console.error("Error saving note to Firebase:", error);
      throw error;
    }
  },

  // Delete a note
  async deleteNote(id: string): Promise<void> {
    try {
      await deleteDoc(doc(firestore, COLLECTION_NAME, id));
    } catch (error) {
      console.error("Error deleting note from Firebase:", error);
      throw error;
    }
  }
};