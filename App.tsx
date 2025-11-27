
import React from 'react';
import { useAppLogic } from './hooks/useAppLogic';

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
  const {
    session, authLoading, userRole, isApproved, isAccountDeleted, permissions, hasAccess, handleLogout, refreshAuth, userProfile, isBanned,
    notes, isConnected, tableMissing, updateStatus,
    myStatus, setMyStatus, isSOS, handleToggleSOS, assignments, handleAcceptAssignment,
    onlineUsers, userLocation, distressedUser, handleLocateSOSUser,
    currentRoute, secondaryRoute, isRouting, handleNavigateToNote, handleStopNavigation, clearSecondaryRoute,
    sidebarOpen, setSidebarOpen, isSatellite, setIsSatellite,
    searchQuery, setSearchQuery, isSearching, handleSearch, flyToTarget, locateUser, isLocating,
    selectedNote, setSelectedNote, flyToNote, handleAnalyzeNote, handleDeleteNote, isAnalyzing,
    showDashboard, setShowDashboard, showSettings, setShowSettings, showFullLogs, setShowFullLogs,
    commandUser, setCommandUser, onUserClick, handleIntercept, handleDispatch,
    showLocationPicker, setShowLocationPicker, handleSelectDispatchLocation,
    dispatchTargetLocation, setDispatchTargetLocation, handleOpenDispatchModal, handleSendDispatchOrder,
    showModal, tempCoords, userNoteInput, setUserNoteInput, isEditingNote,
    handleMapClick, handleEditNote, handleSaveNote, closeModal
  } = useAppLogic();

  // --- Render Guards ---
  if (authLoading) return <LoadingScreen />;

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
        <TacticalOverlay 
          isSOS={isSOS}
          onToggleSOS={handleToggleSOS}
          assignments={assignments}
          onAcceptAssignment={handleAcceptAssignment}
          onExpandLogs={() => setShowFullLogs(true)}
          distressedUser={distressedUser}
          onLocateSOS={handleLocateSOSUser}
        />

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

            showFullLogs={showFullLogs}
            closeFullLogs={() => setShowFullLogs(false)}
        />
      </div>
    </div>
  );
}
