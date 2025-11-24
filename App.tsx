import React, { useState, useEffect } from 'react';
import { identifyLocation, searchPlace } from './services/gemini';
import { getRoute } from './services/routing';
import { MapNote, RouteData } from './types';

// Components
import { Sidebar } from './components/Sidebar';
import { CreateNoteModal } from './components/CreateNoteModal';
import { MapControls } from './components/MapControls';
import { LeafletMap } from './components/LeafletMap';
import { DatabaseSetupModal } from './components/DatabaseSetupModal';
import { AuthPage } from './components/AuthPage';
import { PendingApproval } from './components/PendingApproval';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useNotes } from './hooks/useNotes';
import { useGeolocation } from './hooks/useGeolocation';

export default function App() {
  // Custom Hooks
  const { session, authLoading, userRole, isApproved, isAccountDeleted, handleLogout, refreshAuth } = useAuth();
  
  // Calculate access rights: 
  // 1. Account must exist (not deleted).
  // 2. User must be approved OR be an admin (Admins bypass approval check for safety).
  const hasAccess = !isAccountDeleted && (isApproved || userRole === 'admin');

  const { notes, isConnected, tableMissing, addNote, updateNote, deleteNote, updateStatus, setIsConnected } = useNotes(session, hasAccess, isAccountDeleted);
  const { userLocation } = useGeolocation(session, hasAccess);

  // Local UI State
  const [selectedNote, setSelectedNote] = useState<MapNote | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [isSatellite, setIsSatellite] = useState(() => localStorage.getItem('gemini_map_mode') === 'satellite');
  
  // Search & Navigation State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  
  // Navigation State
  const [currentRoute, setCurrentRoute] = useState<RouteData | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [navigationTarget, setNavigationTarget] = useState<{lat: number, lng: number} | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [tempCoords, setTempCoords] = useState<{lat: number, lng: number} | null>(null);
  const [userNoteInput, setUserNoteInput] = useState("");

  // Map Animation State
  const [flyToTarget, setFlyToTarget] = useState<{lat: number, lng: number, zoom?: number, timestamp: number, showPulse?: boolean} | null>(null);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist Map Mode
  useEffect(() => {
    localStorage.setItem('gemini_map_mode', isSatellite ? 'satellite' : 'street');
  }, [isSatellite]);

  // Dynamic Rerouting Effect
  // Whenever userLocation updates (GPS moves), recalculate route to the target
  useEffect(() => {
    if (!userLocation || !navigationTarget) return;

    const updateRoute = async () => {
        // We don't set isRouting(true) here to avoid UI flickering on every GPS update
        const route = await getRoute(userLocation.lat, userLocation.lng, navigationTarget.lat, navigationTarget.lng);
        if (route) setCurrentRoute(route);
    };

    updateRoute();
  }, [userLocation, navigationTarget]);

  // UI Actions
  const handleMapClick = (lat: number, lng: number) => {
    setTempCoords({ lat, lng });
    setUserNoteInput("");
    setShowModal(true);
    handleStopNavigation(); // Clear nav when clicking elsewhere
  };

  const handleSaveNote = async () => {
    if (!tempCoords) return;
    
    const newNote: MapNote = {
      id: crypto.randomUUID(),
      lat: tempCoords.lat,
      lng: tempCoords.lng,
      userNote: userNoteInput,
      locationName: "Saved Location",
      aiAnalysis: "",
      sources: [],
      createdAt: Date.now(),
      status: 'not_caught'
    };
    
    try {
      await addNote(newNote);
      setSelectedNote(newNote);
      setShowModal(false);
      setTempCoords(null);
      setSidebarOpen(true);
    } catch (error) {
      console.error("Failed to save note", error);
      alert("Failed to save note to database.");
      setIsConnected(false);
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
      await updateNote(updatedNote);
      setSelectedNote(updatedNote);
    } catch (error) {
      console.error("Analysis failed", error);
      alert("AI Analysis failed. Please try again.");
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
      setFlyToTarget({ lat: result.lat, lng: result.lng, zoom: 14, timestamp: Date.now(), showPulse: true });
      setSearchQuery("");
      handleStopNavigation();
      if (window.innerWidth < 768) setSidebarOpen(false);
    }
  };

  const flyToNote = (note: MapNote) => {
    setSelectedNote(note);
    handleStopNavigation();
    setFlyToTarget({ lat: note.lat, lng: note.lng, zoom: 16, timestamp: Date.now() });
    if (window.innerWidth < 768) setSidebarOpen(false);
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteNote(id);
      if (selectedNote?.id === id) setSelectedNote(null);
      if (currentRoute) handleStopNavigation();
    } catch (error) {
      alert("Failed to delete note. Ensure you have admin permissions.");
    }
  };

  const handleNavigateToNote = async (note: MapNote) => {
      if (!userLocation) {
          alert("We need your location. Please wait for GPS.");
          locateUser();
          return;
      }
      
      // Start navigation loop
      setIsRouting(true);
      setNavigationTarget({ lat: note.lat, lng: note.lng });
      
      // Initial fetch
      const route = await getRoute(userLocation.lat, userLocation.lng, note.lat, note.lng);
      setIsRouting(false);
      
      if (route) setCurrentRoute(route);
      else {
        alert("Could not find a driving route.");
        setNavigationTarget(null); // Cancel if failed
      }
  };

  const handleStopNavigation = () => {
    setNavigationTarget(null);
    setCurrentRoute(null);
  };

  const locateUser = () => {
    if (userLocation) {
        setFlyToTarget({ lat: userLocation.lat, lng: userLocation.lng, zoom: 17, timestamp: Date.now() });
    } else {
        alert("Getting location...");
    }
  };

  // Render Logic
  if (authLoading) {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium animate-pulse">Initializing Secure System...</p>
            </div>
        </div>
    );
  }

  if (!session) return <AuthPage />;

  // Enforce access control
  if (!hasAccess) {
      return (
        <PendingApproval 
          onLogout={handleLogout} 
          isDeleted={isAccountDeleted} 
          email={session.user.email} 
          onCheckStatus={refreshAuth}
        />
      );
  }

  if (tableMissing) return <DatabaseSetupModal />;

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
        onDeleteNote={handleDeleteNote}
        onNavigateToNote={handleNavigateToNote}
        onStopNavigation={handleStopNavigation}
        routeData={currentRoute}
        isRouting={isRouting}
        onAnalyzeNote={handleAnalyzeNote}
        isAnalyzing={isAnalyzing}
        onUpdateStatus={updateStatus}
        isConnected={isConnected}
        userRole={userRole}
        onLogout={handleLogout}
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