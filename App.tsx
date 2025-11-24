import React, { useState, useEffect } from 'react';
import { identifyLocation, searchPlace } from './services/gemini';
import { db } from './services/db';
import { MapNote } from './types';
import { Sidebar } from './components/Sidebar';
import { CreateNoteModal } from './components/CreateNoteModal';
import { MapControls } from './components/MapControls';
import { LeafletMap } from './components/LeafletMap';

export default function App() {
  // Application State
  const [notes, setNotes] = useState<MapNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);

  const [selectedNote, setSelectedNote] = useState<MapNote | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Sidebar & Map View State
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [isSatellite, setIsSatellite] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Modal & Interaction State
  const [showModal, setShowModal] = useState(false);
  const [tempCoords, setTempCoords] = useState<{lat: number, lng: number} | null>(null);
  const [userNoteInput, setUserNoteInput] = useState("");

  // Map Control State (Used to trigger Leaflet actions)
  const [flyToTarget, setFlyToTarget] = useState<{lat: number, lng: number, zoom?: number, timestamp: number, showPulse?: boolean} | null>(null);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load notes from IndexedDB on mount
  useEffect(() => {
    const initData = async () => {
      try {
        const savedNotes = await db.getAllNotes();
        setNotes(savedNotes);
      } catch (error) {
        console.error("Failed to load notes from DB", error);
      } finally {
        setLoadingNotes(false);
      }
    };
    initData();
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setTempCoords({ lat, lng });
    setUserNoteInput("");
    setShowModal(true);
  };

  const handleSaveNote = async () => {
    if (!tempCoords) return;
    
    setIsAnalyzing(true);
    
    const result = await identifyLocation(tempCoords.lat, tempCoords.lng, userNoteInput);
    
    const newNote: MapNote = {
      id: Date.now().toString(),
      lat: tempCoords.lat,
      lng: tempCoords.lng,
      userNote: userNoteInput,
      locationName: result.locationName,
      aiAnalysis: result.details,
      sources: result.sources,
      createdAt: Date.now()
    };
    
    try {
      // Save to IndexedDB
      await db.addNote(newNote);
      // Update UI state
      setNotes(prev => [newNote, ...prev]);
      setSelectedNote(newNote);
      setShowModal(false);
      setTempCoords(null);
    } catch (error) {
      console.error("Failed to save note", error);
      alert("Failed to save note to database.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const result = await searchPlace(searchQuery);
    setIsSearching(false);
    
    if (result) {
      // Trigger flyTo via state prop
      setFlyToTarget({ lat: result.lat, lng: result.lng, zoom: 14, timestamp: Date.now(), showPulse: true });
      setSearchQuery("");
      
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }
  };

  const flyToNote = (note: MapNote) => {
    setSelectedNote(note);
    setFlyToTarget({ lat: note.lat, lng: note.lng, zoom: 16, timestamp: Date.now() });
    
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const deleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await db.deleteNote(id);
      setNotes(prev => prev.filter(n => n.id !== id));
      if (selectedNote?.id === id) setSelectedNote(null);
    } catch (error) {
      console.error("Failed to delete note", error);
    }
  };

  const locateUser = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setFlyToTarget({ lat: latitude, lng: longitude, zoom: 15, timestamp: Date.now() });
      });
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden">
      
      <Sidebar 
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        notes={notes}
        selectedNote={selectedNote}
        setSelectedNote={setSelectedNote}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearching={isSearching}
        onSearch={handleSearch}
        onFlyToNote={flyToNote}
        onDeleteNote={deleteNote}
      />

      <div className="flex-1 relative w-full h-full">
        <LeafletMap 
          isSatellite={isSatellite}
          notes={notes}
          selectedNote={selectedNote}
          setSelectedNote={setSelectedNote}
          onMapClick={handleMapClick}
          flyToTarget={flyToTarget}
          tempMarkerCoords={tempCoords}
        />
        
        <MapControls 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isSatellite={isSatellite}
          setIsSatellite={setIsSatellite}
          onLocateUser={locateUser}
        />

        <CreateNoteModal 
          isOpen={showModal}
          onClose={() => { setShowModal(false); setTempCoords(null); }}
          tempCoords={tempCoords}
          userNoteInput={userNoteInput}
          setUserNoteInput={setUserNoteInput}
          onSave={handleSaveNote}
          isAnalyzing={isAnalyzing}
        />
      </div>
    </div>
  );
}
