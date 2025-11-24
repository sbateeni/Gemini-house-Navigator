
import React, { useState, useEffect } from 'react';
import { identifyLocation, searchPlace } from './services/gemini';
import { MapNote, MapUser } from './types';

// Components
import { Sidebar } from './components/Sidebar';
import { CreateNoteModal } from './components/CreateNoteModal';
import { MapControls } from './components/MapControls';
import { LeafletMap } from './components/LeafletMap';
import { DatabaseSetupModal } from './components/DatabaseSetupModal';
import { AuthPage } from './components/AuthPage';
import { PendingApproval } from './components/PendingApproval';
import { AdminDashboard } from './components/AdminDashboard';
import { SettingsModal } from './components/SettingsModal';
import { UserCommandModal } from './components/UserCommandModal';
import { LocationPickerModal } from './components/LocationPickerModal';

// Hooks
import { useAuth } from './hooks/useAuth';
import { useNotes } from './hooks/useNotes';
import { useGeolocation } from './hooks/useGeolocation';
import { usePresence } from './hooks/usePresence';
import { useNavigation } from './hooks/useNavigation';
import { useNoteForm } from './hooks/useNoteForm';

export default function App() {
  // --- 1. Authentication & User Data ---
  const { session, authLoading, userRole, isApproved, isAccountDeleted, handleLogout, refreshAuth } = useAuth();
  const hasAccess = !isAccountDeleted && (isApproved || userRole === 'admin');

  // --- 2. Core Data Hooks ---
  const { notes, isConnected, tableMissing, addNote, updateNote, deleteNote, updateStatus, setIsConnected } = useNotes(session, hasAccess, isAccountDeleted);
  const { userLocation } = useGeolocation(session, hasAccess);
  
  // --- 3. Feature Hooks ---
  const { onlineUsers } = usePresence(session, hasAccess, userLocation); 
  const { 
    currentRoute, 
    secondaryRoute, 
    setSecondaryRoute, 
    calculateRoute, 
    isRouting, 
    handleNavigateToNote, 
    handleNavigateToPoint,
    handleStopNavigation,
    clearSecondaryRoute
  } = useNavigation(userLocation);

  // --- 4. Local UI State ---
  const [selectedNote, setSelectedNote] = useState<MapNote | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [isSatellite, setIsSatellite] = useState(() => localStorage.getItem('gemini_map_mode') === 'satellite');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<{lat: number, lng: number, zoom?: number, timestamp: number, showPulse?: boolean} | null>(null);

  // Modal States
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Tactical Command States
  const [commandUser, setCommandUser] = useState<MapUser | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  // --- 5. Form Logic Hook ---
  const { 
      showModal, tempCoords, userNoteInput, setUserNoteInput, isEditingNote,
      handleMapClick, handleEditNote, handleSaveNote, closeModal 
  } = useNoteForm(addNote, updateNote, setIsConnected, setSelectedNote, setSidebarOpen);

  // --- 6. Effects ---
  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('gemini_map_mode', isSatellite ? 'satellite' : 'street');
  }, [isSatellite]);

  // --- 7. Handlers ---
  const locateUser = () => {
    if (userLocation) {
        setFlyToTarget({ lat: userLocation.lat, lng: userLocation.lng, zoom: 17, timestamp: Date.now() });
    } else {
        alert("Getting location...");
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

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this note?")) {
      try {
        await deleteNote(id);
        if (selectedNote?.id === id) setSelectedNote(null);
        if (currentRoute) handleStopNavigation();
      } catch (error) {
        alert("Failed to delete note. Ensure you have admin permissions.");
      }
    }
  };

  // Tactical Command Handlers
  const onUserClick = (user: MapUser) => {
    if (userRole === 'admin') {
      setCommandUser(user);
    }
  };

  const handleIntercept = () => {
    if (!commandUser) return;
    handleNavigateToPoint(commandUser.lat, commandUser.lng);
    setCommandUser(null);
  };

  const handleDispatch = () => {
    setShowLocationPicker(true);
    // Keep commandUser for context, but maybe close the first modal or overlay it
    // We can keep commandUser set, but set showLocationPicker true.
    // Ideally close Command Modal first visually? 
    // Let's rely on conditional rendering or z-index.
    // The LocationPicker uses commandUser to know who we are dispatching.
  };

  const handleSelectDispatchLocation = async (note: MapNote) => {
    if (!commandUser) return;
    
    // Calculate route from CommandUser to Note
    const route = await calculateRoute(
      { lat: commandUser.lat, lng: commandUser.lng },
      { lat: note.lat, lng: note.lng }
    );
    
    if (route) {
        setSecondaryRoute(route);
        // Also fly map to see the route
        // Find midpoint or fit bounds? Leaflet map handles route fitting, but let's fly to user
        setFlyToTarget({ lat: commandUser.lat, lng: commandUser.lng, zoom: 13, timestamp: Date.now() });
    } else {
        alert("Could not calculate dispatch route.");
    }

    setShowLocationPicker(false);
    setCommandUser(null);
  };

  // --- 8. Render Guards ---
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
        onEditNote={handleEditNote} 
        onNavigateToNote={(note) => handleNavigateToNote(note, locateUser)}
        onStopNavigation={() => { handleStopNavigation(); clearSecondaryRoute(); }}
        routeData={currentRoute}
        isRouting={isRouting}
        onAnalyzeNote={handleAnalyzeNote}
        isAnalyzing={isAnalyzing}
        onUpdateStatus={updateStatus}
        isConnected={isConnected}
        userRole={userRole}
        onLogout={handleLogout}
        onOpenDashboard={() => setShowDashboard(true)} 
        onOpenSettings={() => setShowSettings(true)}
      />

      <div className="flex-1 relative w-full h-full">
        <LeafletMap 
          isSatellite={isSatellite}
          notes={notes}
          selectedNote={selectedNote}
          setSelectedNote={setSelectedNote}
          onMapClick={(lat, lng) => handleMapClick(lat, lng, handleStopNavigation)}
          flyToTarget={flyToTarget}
          tempMarkerCoords={tempCoords}
          userLocation={userLocation}
          currentRoute={currentRoute}
          secondaryRoute={secondaryRoute} // Render dashed line
          otherUsers={onlineUsers} 
          onUserClick={onUserClick} // Handle clicks on blue dots
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
          onClose={closeModal}
          tempCoords={tempCoords}
          userNoteInput={userNoteInput}
          setUserNoteInput={setUserNoteInput}
          onSave={handleSaveNote}
          isAnalyzing={isAnalyzing}
          mode={isEditingNote ? 'edit' : 'create'}
        />

        {/* Admin Dashboard Modal */}
        {userRole === 'admin' && (
          <AdminDashboard 
            isOpen={showDashboard} 
            onClose={() => setShowDashboard(false)} 
            currentUserId={session.user.id}
          />
        )}

        {/* Settings Modal (Admin Only) */}
        {userRole === 'admin' && (
          <SettingsModal 
            isOpen={showSettings}
            onClose={() => setShowSettings(false)}
            user={session.user}
            userRole={userRole}
            isSatellite={isSatellite}
            setIsSatellite={setIsSatellite}
          />
        )}

        {/* Tactical Command Modals (Admin Only) */}
        {userRole === 'admin' && (
            <>
                <UserCommandModal 
                    isOpen={!!commandUser && !showLocationPicker}
                    onClose={() => setCommandUser(null)}
                    user={commandUser}
                    onIntercept={handleIntercept}
                    onDispatch={handleDispatch}
                />
                
                <LocationPickerModal
                    isOpen={showLocationPicker}
                    onClose={() => { setShowLocationPicker(false); setCommandUser(null); }}
                    notes={notes}
                    onSelectLocation={handleSelectDispatchLocation}
                    targetUserName={commandUser?.username}
                />
            </>
        )}
      </div>
    </div>
  );
}
