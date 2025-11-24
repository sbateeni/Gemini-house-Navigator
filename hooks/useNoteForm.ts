
import { useState } from 'react';
import { MapNote, UserProfile } from '../types';

export function useNoteForm(
    addNote: (n: MapNote) => Promise<void>,
    updateNote: (n: MapNote) => Promise<void>,
    setIsConnected: (s: boolean) => void,
    setSelectedNote: (n: MapNote | null) => void,
    setSidebarOpen: (o: boolean) => void,
    userProfile: UserProfile | null
) {
  const [showModal, setShowModal] = useState(false);
  const [tempCoords, setTempCoords] = useState<{lat: number, lng: number} | null>(null);
  const [userNoteInput, setUserNoteInput] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteData, setEditingNoteData] = useState<MapNote | null>(null);

  const handleMapClick = (lat: number, lng: number, stopNavCallback: () => void) => {
    setTempCoords({ lat, lng });
    setUserNoteInput("");
    setIsEditingNote(false);
    setEditingNoteData(null);
    setShowModal(true);
    stopNavCallback();
  };

  const handleEditNote = (note: MapNote, e: React.MouseEvent) => {
    e.stopPropagation();
    setTempCoords({ lat: note.lat, lng: note.lng });
    setUserNoteInput(note.userNote);
    setEditingNoteData(note);
    setSelectedNote(note); 
    setIsEditingNote(true);
    setShowModal(true);
  };

  const handleSaveNote = async () => {
    if (!tempCoords) return;

    try {
      if (isEditingNote && editingNoteData) {
        // UPDATE EXISTING
        const updatedNote: MapNote = {
          ...editingNoteData,
          userNote: userNoteInput,
        };
        await updateNote(updatedNote);
        setSelectedNote(updatedNote);
      } else {
        // CREATE NEW
        const newNote: MapNote = {
          id: crypto.randomUUID(),
          lat: tempCoords.lat,
          lng: tempCoords.lng,
          userNote: userNoteInput,
          locationName: "موقع محدد",
          aiAnalysis: "",
          sources: [],
          createdAt: Date.now(),
          status: 'not_caught',
          // Auto-tag hierarchy
          governorate: userProfile?.governorate,
          center: userProfile?.center
        };
        await addNote(newNote);
        setSelectedNote(newNote);
      }
      
      setShowModal(false);
      setTempCoords(null);
      setSidebarOpen(true);
    } catch (error) {
      console.error("Failed to save note", error);
      alert("Failed to save/update note.");
      setIsConnected(false);
    }
  };

  const closeModal = () => {
      setShowModal(false);
      setTempCoords(null);
  };

  return {
    showModal,
    tempCoords,
    userNoteInput,
    setUserNoteInput,
    isEditingNote,
    handleMapClick,
    handleEditNote,
    handleSaveNote,
    closeModal
  };
}
