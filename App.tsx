import React, { useState, useEffect } from 'react';
import { identifyLocation, searchPlace } from './services/gemini';
import { MapNote, MapUser, Assignment, UnitStatus } from './types';
import { db } from './services/db';

// Components
import { ModalContainer } from './components/ModalContainer';
import { Sidebar } from './components/Sidebar';
import { MapControls } from './components/MapControls';
import { LeafletMap } from './components/LeafletMap';
import { DatabaseSetupModal } from './components/DatabaseSetupModal';
import { AuthPage } from './components/AuthPage';
import { PendingApproval } from './components/PendingApproval';
import { NotificationBell } from './components/NotificationBell';
import { SOSButton } from './components/SOSButton';
import { OperationsLog } from './components/OperationsLog';
import { PlaneView } from './components/PlaneView'; // Imported PlaneView

// Hooks
import { useAuth } from './hooks/useAuth';
import { useNotes } from './hooks/useNotes';
import { useGeolocation } from './hooks/useGeolocation';
import { usePresence } from './hooks/usePresence';
import { useNavigation } from './hooks/useNavigation';
import { useNoteForm } from './hooks/useNoteForm';
import { useAssignments } from './hooks/useAssignments';

export default function App() {
  // --- 1. Authentication & User Data ---
  const { session, authLoading, userRole, isApproved, permissions, isAccountDeleted, handleLogout, refreshAuth, userProfile } = useAuth();
  const isBanned = userRole === 'banned';
  // Super Admins, Gov Admins, Center Admins and generic Admins bypass certain checks
  const isAnyAdmin = ['admin', 'super_admin', 'governorate_admin', 'center_admin'].includes(userRole || '');
  const hasAccess = !isAccountDeleted && !isBanned && (isApproved || isAnyAdmin);

  // --- 2. Tactical State ---
  const [myStatus, setMyStatus] = useState<UnitStatus>('patrol');
  const [isSOS, setIsSOS] = useState(false);

  // --- 3. Core Data Hooks ---
  const { notes, isConnected, tableMissing, addNote, updateNote, deleteNote, updateStatus, setIsConnected } = useNotes(session, hasAccess, isAccountDeleted, userProfile);
  const { userLocation } = useGeolocation(session, hasAccess);
  const { assignments, acceptAssignment } = useAssignments(session?.user?.id);
  
  // --- 4. Feature Hooks ---
  const { onlineUsers } = usePresence(session, hasAccess, userLocation, myStatus, isSOS); 
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

  // --- 5. Local UI State ---
  const [selectedNote, setSelectedNote] = useState<MapNote | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [isSatellite, setIsSatellite] = useState(() => localStorage.getItem('gemini_map_mode') === 'satellite');
  
  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [flyToTarget, setFlyToTarget] = useState<{lat: number, lng: number, zoom?: number, timestamp: number, showPulse?: boolean} | null>(null);
  const [isLocating, setIsLocating] = useState(false); // New state for location loading

  // Modal States
  const [showDashboard, setShowDashboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Tactical Command States
  const [commandUser, setCommandUser] = useState<MapUser | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [dispatchTargetLocation, setDispatchTargetLocation] = useState<MapNote | null>(null);

  // --- 6. Form Logic Hook ---
  const { 
      showModal, tempCoords, userNoteInput, setUserNoteInput, isEditingNote,
      handleMapClick, handleEditNote, handleSaveNote, closeModal 
  } = useNoteForm(addNote, updateNote, setIsConnected, setSelectedNote, setSidebarOpen, userProfile);

  // --- 7. Effects ---
  useEffect(() => {
    const handleResize = () => setSidebarOpen(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    localStorage.setItem('gemini_map_mode', isSatellite ? 'satellite' : 'street');
  }, [isSatellite]);

  // Log status changes
  useEffect(() => {
    if (session?.user && hasAccess) {
       db.createLogEntry({
          message: `الوحدة ${session.user.user_metadata?.username || 'User'} غيرت الحالة إلى ${myStatus.toUpperCase()}`,
          type: 'status',
          userId: session.user.id,
          timestamp: Date.now(),
          governorate: userProfile?.governorate // Log context
       });
    }
  }, [myStatus, session?.user?.id, userProfile?.governorate]);

  // --- 8. Handlers ---
  const locateUser = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
        alert("المتصفح لا يدعم تحديد الموقع.");
        setIsLocating(false);
        return;
    }

    // Force a fresh read for instant response
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            setFlyToTarget({ 
                lat: latitude, 
                lng: longitude, 
                zoom: 17, 
                timestamp: Date.now() 
            });
            setIsLocating(false);
        },
        (err) => {
            console.error(err);
            alert("تعذر تحديد الموقع الحالي. تأكد من تفعيل GPS.");
            setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleToggleSOS = () => {
     const newState = !isSOS;
     setIsSOS(newState);
     if (session?.user) {
         db.createLogEntry({
             message: newState 
                ? `🚨 استغاثة عاجلة من ${session.user.user_metadata?.username?.toUpperCase()} 🚨` 
                : `${session.user.user_metadata?.username} ألغى الاستغاثة`,
             type: 'alert',
             userId: session.user.id,
             timestamp: Date.now(),
             governorate: userProfile?.governorate
         });
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
      alert("فشل التحليل الذكي.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("هل أنت متأكد من حذف هذا الموقع؟")) {
      try {
        await deleteNote(id);
        if (selectedNote?.id === id) setSelectedNote(null);
        if (currentRoute) handleStopNavigation();
      } catch (error) {
        alert("فشل الحذف. تأكد من الصلاحيات.");
      }
    }
  };

  // Tactical Command Handlers
  const onUserClick = (user: MapUser) => {
    if (isAnyAdmin) {
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
  };

  const handleSelectDispatchLocation = async (note: MapNote) => {
    if (!commandUser) return;
    const route = await calculateRoute(
      { lat: commandUser.lat, lng: commandUser.lng },
      { lat: note.lat, lng: note.lng }
    );
    if (route) {
        setSecondaryRoute(route);
        setFlyToTarget({ lat: commandUser.lat, lng: commandUser.lng, zoom: 13, timestamp: Date.now() });
    } else {
        alert("فشل حساب مسار التوجيه.");
    }
    setShowLocationPicker(false);
    setCommandUser(null);
  };

  // Dispatch System Handlers
  const handleOpenDispatchModal = (note: MapNote) => {
    setDispatchTargetLocation(note);
  };

  const handleSendDispatchOrder = async (targetUserId: string, instructions: string) => {
    if (!dispatchTargetLocation || !session?.user) return;
    try {
      await db.createAssignment({
        targetUserId,
        locationId: dispatchTargetLocation.id,
        locationName: dispatchTargetLocation.locationName,
        lat: dispatchTargetLocation.lat,
        lng: dispatchTargetLocation.lng,
        instructions,
        createdBy: session.user.id
      });
      // Log it
      await db.createLogEntry({
          message: `تم إرسال تكليف للوحدة`,
          type: 'dispatch',
          userId: session.user.id,
          timestamp: Date.now(),
          governorate: userProfile?.governorate
      });
      alert("تم الإرسال بنجاح!");
    } catch (e) {
      console.error("Dispatch failed", e);
      alert("فشل الإرسال.");
    }
  };

  const handleAcceptAssignment = (assignment: Assignment) => {
    acceptAssignment(assignment.id);
    handleNavigateToPoint(assignment.lat, assignment.lng);
    setFlyToTarget({ lat: assignment.lat, lng: assignment.lng, zoom: 16, timestamp: Date.now() });
  };


  // --- 9. Render Guards ---
  if (authLoading) {
    return (
        <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium animate-pulse">جاري تحميل نظام القيادة...</p>
            </div>
        </div>
    );
  }

  if (!session) return <AuthPage />;

  if (!hasAccess) {
      return (
        <PendingApproval 
          onLogout={handleLogout} 
          isDeleted={isAccountDeleted || isBanned} 
          email={session.user.email} 
          onCheckStatus={refreshAuth}
        />
      );
  }

  if (tableMissing) return <DatabaseSetupModal />;

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden" dir="rtl">
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
        onNavigateToNote={(note) => {
            if (permissions.can_navigate) handleNavigateToNote(note, locateUser);
            else alert("ليس لديك صلاحية الملاحة.");
        }}
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
        canCreate={permissions.can_create} 
        myStatus={myStatus}
        setMyStatus={setMyStatus}
        onlineUsers={onlineUsers}
      />

      <div className="flex-1 relative w-full h-full">
        <PlaneView /> {/* Added PlaneView for HUD/Cockpit visuals */}
        <NotificationBell assignments={assignments} onAccept={handleAcceptAssignment} />
        
        {/* Panic Button */}
        <SOSButton isActive={isSOS} onToggle={handleToggleSOS} />

        <LeafletMap 
          isSatellite={isSatellite}
          notes={notes}
          selectedNote={selectedNote}
          setSelectedNote={setSelectedNote}
          onMapClick={(lat, lng) => {
              if (permissions.can_create) {
                 handleMapClick(lat, lng, handleStopNavigation);
              }
          }}
          flyToTarget={flyToTarget}
          tempMarkerCoords={tempCoords}
          userLocation={userLocation}
          currentRoute={currentRoute}
          secondaryRoute={secondaryRoute}
          otherUsers={onlineUsers} 
          onUserClick={onUserClick}
          canSeeOthers={permissions.can_see_others}
          onNavigate={(note) => {
             if (permissions.can_navigate) handleNavigateToNote(note, locateUser);
             else alert("صلاحية الملاحة مرفوضة.");
          }}
          onDispatch={handleOpenDispatchModal}
          userRole={userRole}
        />
        
        <MapControls 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isSatellite={isSatellite}
          setIsSatellite={setIsSatellite}
          onLocateUser={locateUser}
          isLocating={isLocating}
        />

        {/* Live Operations Log */}
        <OperationsLog />

        {/* Modals Container */}
        <ModalContainer
            showCreateModal={showModal}
            closeCreateModal={closeModal}
            tempCoords={tempCoords}
            userNoteInput={userNoteInput}
            setUserNoteInput={setUserNoteInput}
            onSaveNote={handleSaveNote}
            isAnalyzing={isAnalyzing}
            isEditingNote={isEditingNote}
            
            showDashboard={showDashboard}
            closeDashboard={() => setShowDashboard(false)}
            currentUserId={session.user.id}
            currentUserProfile={userProfile}
            
            showSettings={showSettings}
            closeSettings={() => setShowSettings(false)}
            user={session.user}
            userRole={userRole}
            isSatellite={isSatellite}
            setIsSatellite={setIsSatellite}
            
            commandUser={commandUser}
            closeCommandUser={() => setCommandUser(null)}
            onIntercept={handleIntercept}
            onDispatch={handleDispatch}
            
            showLocationPickerModal={showLocationPicker}
            closeLocationPicker={() => { setShowLocationPicker(false); setCommandUser(null); }}
            notes={notes}
            onSelectDispatchLocation={handleSelectDispatchLocation}
            commandUserName={commandUser?.username}
            
            dispatchTargetLocation={dispatchTargetLocation}
            closeDispatchModal={() => setDispatchTargetLocation(null)}
            onSendDispatch={handleSendDispatchOrder}
        />
      </div>
    </div>
  );
}