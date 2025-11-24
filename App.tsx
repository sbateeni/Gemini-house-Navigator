import React, { useState, useEffect } from 'react';
import { identifyLocation, searchPlace } from './services/gemini';
import { db } from './services/db';
import { getRoute } from './services/routing';
import { MapNote, RouteData } from './types';
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
  
  // Navigation State
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [currentRoute, setCurrentRoute] = useState<RouteData | null>(null);
  const [isRouting, setIsRouting] = useState(false);

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

  // Get user location initially and watch it with High Accuracy
  useEffect(() => {
    if (navigator.geolocation) {
        const watchId = navigator.geolocation.watchPosition(
            (pos) => {
                setUserLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
            },
            (err) => console.log("Location access denied or error", err),
            { 
              enableHighAccuracy: true,
              maximumAge: 0,
              timeout: 15000
            }
        );
        return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    setTempCoords({ lat, lng });
    setUserNoteInput("");
    setShowModal(true);
    // Clear route on new interaction
    setCurrentRoute(null);
  };

  const handleSaveNote = async () => {
    if (!tempCoords) return;
    
    // Save IMMEDIATELY without analysis
    const newNote: MapNote = {
      id: Date.now().toString(),
      lat: tempCoords.lat,
      lng: tempCoords.lng,
      userNote: userNoteInput,
      locationName: "Saved Location", // Default name
      aiAnalysis: "", // Empty analysis indicates it needs processing later
      sources: [],
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
      // Open sidebar to show the new note
      setSidebarOpen(true);
    } catch (error) {
      console.error("Failed to save note", error);
      alert("Failed to save note to database.");
    }
  };

  const handleAnalyzeNote = async (note: MapNote) => {
    setIsAnalyzing(true);
    try {
      const result = await identifyLocation(note.lat, note.lng, note.userNote);
      
      const updatedNote: MapNote = {
        ...note,
        locationName: result.locationName,
        aiAnalysis: result.details,
        sources: result.sources
      };

      await db.addNote(updatedNote); // Re-save updated note
      setNotes(prev => prev.map(n => n.id === note.id ? updatedNote : n));
      setSelectedNote(updatedNote);
    } catch (error) {
      console.error("Analysis failed", error);
      alert("AI Analysis failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: 'caught' | 'not_caught') => {
    const noteToUpdate = notes.find(n => n.id === id);
    if (!noteToUpdate) return;

    // Toggle logic: if clicking the same status, revert to undefined (optional, or just update)
    // For now, simple update
    const updatedNote: MapNote = { ...noteToUpdate, status };

    try {
      await db.addNote(updatedNote);
      setNotes(prev => prev.map(n => n.id === id ? updatedNote : n));
      if (selectedNote?.id === id) setSelectedNote(updatedNote);
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    const result = await searchPlace(searchQuery);
    setIsSearching(false);
    
    if (result) {
      setFlyToTarget({ lat: result.lat, lng: result.lng, zoom: 14, timestamp: Date.now(), showPulse: true });
      setSearchQuery("");
      setCurrentRoute(null);
      
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }
  };

  const flyToNote = (note: MapNote) => {
    setSelectedNote(note);
    setCurrentRoute(null);
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
      if (currentRoute) setCurrentRoute(null);
    } catch (error) {
      console.error("Failed to delete note", error);
    }
  };

  const locateUser = () => {
    if (userLocation) {
        setFlyToTarget({ lat: userLocation.lat, lng: userLocation.lng, zoom: 17, timestamp: Date.now() });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        setFlyToTarget({ lat: latitude, lng: longitude, zoom: 17, timestamp: Date.now() });
      }, (err) => {
          alert("Could not get your location. Please check permissions.");
      }, { enableHighAccuracy: true });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
  };

  const handleNavigateToNote = async (note: MapNote) => {
      if (!userLocation) {
          alert("We need your location to calculate a route. Please wait for GPS fix or check permissions.");
          locateUser();
          return;
      }
      
      setIsRouting(true);
      const route = await getRoute(userLocation.lat, userLocation.lng, note.lat, note.lng);
      setIsRouting(false);

      if (route) {
          setCurrentRoute(route);
      } else {
          alert("Could not find a driving route to this location.");
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
        onNavigateToNote={handleNavigateToNote}
        routeData={currentRoute}
        isRouting={isRouting}
        onAnalyzeNote={handleAnalyzeNote}
        isAnalyzing={isAnalyzing}
        onUpdateStatus={handleUpdateStatus}
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
          userLocation={userLocation}
          currentRoute={currentRoute}
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