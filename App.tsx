
import React, { useState, useEffect } from 'react';
import { useAppLogic } from './hooks/useAppLogic';
import { SourceSession } from './types';
import { db } from './services/db';
import { Timer, LogOut } from 'lucide-react';

// Components
import { ModalContainer } from './components/ModalContainer';
import { Sidebar } from './components/Sidebar';
import { MapControls } from './components/MapControls';
import { LeafletMap } from './components/LeafletMap';
import { DatabaseSetupModal } from './components/DatabaseSetupModal';
import { AuthPage } from './components/AuthPage';
import { PendingApproval } from './components/PendingApproval';
import { LoadingScreen } from './components/layout/LoadingScreen';
import { TacticalOverlay } from './components/layout/TacticalOverlay';

export default function App() {
  // SOURCE MODE STATE
  const [sourceSession, setSourceSession] = useState<SourceSession | null>(null);
  const [sourceTimeLeft, setSourceTimeLeft] = useState<number>(0);

  const {
    session, authLoading, userRole, isApproved, isAccountDeleted, permissions, hasAccess, handleLogout, refreshAuth, userProfile, isBanned,
    notes, isConnected, tableMissing, updateStatus, setNotes,
    myStatus, setMyStatus, isSOS, handleToggleSOS, assignments, handleAcceptAssignment,
    onlineUsers, userLocation, distressedUser, handleLocateSOSUser,
    currentRoute, secondaryRoute, isRouting, handleNavigateToNote, handleStopNavigation, clearSecondaryRoute,
    sidebarOpen, setSidebarOpen, isSatellite, setIsSatellite, mapProvider, setMapProvider,
    searchQuery, setSearchQuery, isSearching, handleSearch, flyToTarget, locateUser, isLocating,
    selectedNote, setSelectedNote, flyToNote, handleAnalyzeNote, handleDeleteNote, isAnalyzing,
    showDashboard, setShowDashboard, showSettings, setShowSettings, showFullLogs, setShowFullLogs,
    commandUser, setCommandUser, onUserClick, handleIntercept, handleDispatch,
    showLocationPicker, setShowLocationPicker, handleSelectDispatchLocation,
    dispatchTargetLocation, setDispatchTargetLocation, handleOpenDispatchModal, handleSendDispatchOrder,
    showModal, tempCoords, userNoteInput, setUserNoteInput, isEditingNote,
    handleMapClick, handleEditNote, handleSaveNote, closeModal
  } = useAppLogic();

  // --- Source Logic ---
  const handleSourceLogin = (session: SourceSession) => {
      setSourceSession(session);
      // Fetch Source notes
      db.getAllNotes(undefined, session.code).then(setNotes);
  };

  const handleSourceLogout = () => {
      setSourceSession(null);
      setNotes([]);
  };

  // Source Timer
  useEffect(() => {
      if (!sourceSession) return;
      const interval = setInterval(() => {
          const left = Math.max(0, Math.ceil((sourceSession.expiresAt - Date.now()) / 1000));
          setSourceTimeLeft(left);
          if (left <= 0) {
              alert("انتهت صلاحية الجلسة.");
              handleSourceLogout();
          }
      }, 1000);
      return () => clearInterval(interval);
  }, [sourceSession]);

  // Inject source code into new notes if in source mode
  const handleSourceSaveNote = async () => {
      if (!sourceSession || !tempCoords) return;
      const newNote = {
          id: crypto.randomUUID(),
          lat: tempCoords.lat,
          lng: tempCoords.lng,
          userNote: userNoteInput,
          locationName: "موقع محدد (مصدر)",
          aiAnalysis: "",
          sources: [],
          createdAt: Date.now(),
          status: 'not_caught' as const,
          accessCode: sourceSession.code
      };
      
      try {
          await db.addNote(newNote); // Will use RPC
          setNotes(prev => [newNote, ...prev]);
          closeModal();
          setUserNoteInput("");
      } catch(e) {
          alert("فشل الحفظ. ربما انتهت الصلاحية.");
          handleSourceLogout();
      }
  };


  // --- Render Guards ---
  if (authLoading && !sourceSession) return <LoadingScreen />;

  // Auth Page if no session AND no source session
  if (!session && !sourceSession) return <AuthPage onSourceLogin={handleSourceLogin} />;

  // Pending Approval (Only if not source)
  if (!sourceSession && !hasAccess && session) {
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
      
      {/* Source Mode Timer Overlay */}
      {sourceSession && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] bg-green-900/90 border border-green-500 rounded-full px-6 py-2 shadow-2xl flex items-center gap-4">
              <div className="flex items-center gap-2 text-green-200 font-mono font-bold text-lg">
                  <Timer className="animate-pulse" />
                  <span>
                      {Math.floor(sourceTimeLeft / 60)}:{(sourceTimeLeft % 60).toString().padStart(2, '0')}
                  </span>
              </div>
              <button 
                  onClick={handleSourceLogout}
                  className="bg-red-600 hover:bg-red-500 text-white p-1 rounded-full"
                  title="خروج"
              >
                  <LogOut size={16} />
              </button>
          </div>
      )}

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
            if (sourceSession || permissions.can_navigate) handleNavigateToNote(note, locateUser);
            else alert("ليس لديك صلاحية الملاحة.");
        }}
        onStopNavigation={() => { handleStopNavigation(); clearSecondaryRoute(); }}
        routeData={currentRoute}
        isRouting={isRouting}
        onAnalyzeNote={handleAnalyzeNote}
        isAnalyzing={isAnalyzing}
        onUpdateStatus={updateStatus}
        isConnected={isConnected}
        userRole={sourceSession ? 'source' : userRole}
        onLogout={sourceSession ? handleSourceLogout : handleLogout}
        onOpenDashboard={() => setShowDashboard(true)} 
        onOpenSettings={() => setShowSettings(true)}
        canCreate={!!sourceSession || permissions.can_create} 
        myStatus={myStatus}
        setMyStatus={setMyStatus}
        onlineUsers={sourceSession ? [] : onlineUsers} // Hide users from source
        currentUserId={session?.user?.id || ''}
      />

      <div className="flex-1 relative w-full h-full">
        {/* Hide Tactical Overlay for Source */}
        {!sourceSession && (
            <TacticalOverlay 
            isSOS={isSOS}
            onToggleSOS={handleToggleSOS}
            onExpandLogs={() => setShowFullLogs(true)}
            distressedUser={distressedUser}
            onLocateSOS={handleLocateSOSUser}
            />
        )}

        <LeafletMap 
          isSatellite={isSatellite}
          mapProvider={mapProvider}
          notes={notes}
          selectedNote={selectedNote}
          setSelectedNote={setSelectedNote}
          onMapClick={(lat, lng) => {
              if (sourceSession || permissions.can_create) {
                 handleMapClick(lat, lng, handleStopNavigation);
              }
          }}
          flyToTarget={flyToTarget}
          tempMarkerCoords={tempCoords}
          userLocation={userLocation}
          currentRoute={currentRoute}
          secondaryRoute={secondaryRoute}
          otherUsers={sourceSession ? [] : onlineUsers} // Hide users from source
          onUserClick={onUserClick}
          canSeeOthers={!sourceSession && permissions.can_see_others}
          onNavigate={(note) => {
             if (sourceSession || permissions.can_navigate) handleNavigateToNote(note, locateUser);
             else alert("صلاحية الملاحة مرفوضة.");
          }}
          onDispatch={handleOpenDispatchModal}
          userRole={sourceSession ? 'source' : userRole}
        />
        
        <MapControls 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isSatellite={isSatellite}
          setIsSatellite={setIsSatellite}
          onLocateUser={locateUser}
          isLocating={isLocating}
          assignments={sourceSession ? [] : assignments} // No assignments for source
          onAcceptAssignment={handleAcceptAssignment}
          hasActiveRoute={!!currentRoute || !!secondaryRoute}
          onClearRoute={() => {
              handleStopNavigation();
              clearSecondaryRoute();
          }}
        />

        <ModalContainer
            showCreateModal={showModal}
            closeCreateModal={closeModal}
            tempCoords={tempCoords}
            userNoteInput={userNoteInput}
            setUserNoteInput={setUserNoteInput}
            onSaveNote={sourceSession ? handleSourceSaveNote : handleSaveNote}
            isAnalyzing={isAnalyzing}
            isEditingNote={isEditingNote}
            
            showDashboard={showDashboard}
            closeDashboard={() => setShowDashboard(false)}
            currentUserId={session?.user?.id || ''}
            currentUserProfile={userProfile}
            
            showSettings={showSettings}
            closeSettings={() => setShowSettings(false)}
            user={session?.user}
            userRole={sourceSession ? 'source' : userRole}
            mapProvider={mapProvider}
            setMapProvider={setMapProvider}
            
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

            showFullLogs={showFullLogs}
            closeFullLogs={() => setShowFullLogs(false)}
        />
      </div>
    </div>
  );
}
