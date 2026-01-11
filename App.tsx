
import React, { useState } from 'react';
import { useAppLogic } from './hooks/useAppLogic';
import { SourceSession } from './types';
import { identifyLocation } from './services/gemini';
import { X, Sparkles, Map as MapIcon, ShieldAlert } from 'lucide-react';

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
  const [sourceSession, setSourceSession] = useState<SourceSession | null>(null);
  const [showDatabaseFix, setShowDatabaseFix] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);

  // --- 1. CORE LOGIC HOOKS ---
  const logic = useAppLogic(!!sourceSession);

  const handleAIAnalysis = async (lat: number, lng: number) => {
    setIsAILoading(true);
    try {
      const result = await identifyLocation(lat, lng, "تحليل استخباراتي للموقع المختار");
      setAiAnalysis(result.details);
    } catch (e) {
      setAiAnalysis("عذراً، تعذر الوصول للمحلل الذكي حالياً.");
    } finally {
      setIsAILoading(false);
    }
  };

  const {
    session, authLoading, userRole, isApproved, isAccountDeleted, permissions, handleLogout, refreshAuth, userProfile, isBanned,
    notes, isConnected, tableMissing, updateStatus,
    myStatus, setMyStatus, isSOS, handleToggleSOS, assignments, handleAcceptAssignment,
    onlineUsers, userLocation, distressedUser, handleLocateSOSUser, allProfiles,
    currentRoute, secondaryRoute, isRouting, handleNavigateToNote, handleStopNavigation,
    sidebarOpen, setSidebarOpen, isSatellite, setIsSatellite, mapProvider, setMapProvider,
    searchQuery, setSearchQuery, isSearching, handleSearch, flyToTarget, locateUser, isLocating,
    selectedNote, setSelectedNote, flyToNote, handleAnalyzeNote, handleDeleteNote, isAnalyzing,
    showDashboard, setShowDashboard, showSettings, setShowSettings, showFullLogs, setShowFullLogs,
    showCampaigns, setShowCampaigns,
    commandUser, setCommandUser, onUserClick, handleIntercept, handleDispatch,
    showLocationPicker, setShowLocationPicker, handleSelectDispatchLocation,
    dispatchTargetLocation, setDispatchTargetLocation, handleSendDispatchOrder,
    showModal, tempCoords, userNoteInput, setUserNoteInput, isEditingNote,
    handleMapClick, handleEditNote, handleSaveNote, closeModal,
    setTargetUserFilter,
    activeCampaign, handleStartCampaign, handleUpdateCampaign
  } = logic;

  if (authLoading && !sourceSession) {
    return <LoadingScreen />;
  }
  
  if (!session && !sourceSession) {
    return <AuthPage onSourceLogin={(s) => setSourceSession(s)} />;
  }

  if (!isApproved && !sourceSession && session && !isBanned) {
      return (
        <PendingApproval 
            onLogout={handleLogout} 
            isDeleted={isAccountDeleted} 
            email={session.user?.email}
            onCheckStatus={refreshAuth}
        />
      );
  }

  return (
    <div className="flex h-screen w-full bg-[#020617] text-white overflow-hidden select-none" dir="rtl">
      {/* 1. Sidebar */}
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
          onNavigateToNote={handleNavigateToNote}
          onStopNavigation={handleStopNavigation}
          routeData={currentRoute}
          isRouting={isRouting}
          onAnalyzeNote={(note) => {
              handleAIAnalysis(note.lat, note.lng);
              handleAnalyzeNote(note);
          }}
          isAnalyzing={isAnalyzing || isAILoading}
          onUpdateStatus={updateStatus}
          isConnected={isConnected}
          userRole={sourceSession ? 'source' : userRole}
          onLogout={handleLogout}
          onOpenDashboard={() => setShowDashboard(true)} 
          onOpenSettings={() => setShowSettings(true)}
          onOpenCampaigns={() => setShowCampaigns(true)}
          canCreate={permissions.can_create} 
          myStatus={myStatus}
          setMyStatus={setMyStatus}
          onlineUsers={onlineUsers} 
          currentUserId={userProfile?.id || ''}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 relative h-full overflow-hidden">
        
        {/* Map Background */}
        <LeafletMap 
          isSatellite={isSatellite}
          mapProvider={mapProvider}
          notes={notes} 
          selectedNote={selectedNote}
          setSelectedNote={setSelectedNote}
          onMapClick={handleMapClick}
          flyToTarget={flyToTarget}
          tempMarkerCoords={tempCoords}
          userLocation={userLocation}
          currentRoute={currentRoute}
          secondaryRoute={secondaryRoute}
          otherUsers={onlineUsers}
          onUserClick={onUserClick}
          canSeeOthers={permissions.can_see_others}
          userRole={userRole}
          currentUserId={userProfile?.id}
        />

        {/* HUD: Tactical Overlay (SOS, Logs) */}
        <TacticalOverlay 
            isSOS={isSOS}
            onToggleSOS={handleToggleSOS}
            onExpandLogs={() => setShowFullLogs(true)}
            distressedUser={distressedUser}
            onLocateSOS={handleLocateSOSUser}
        />

        {/* AI Intelligence Floating Modal */}
        {aiAnalysis && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[4000] w-[90%] max-w-lg glass-panel p-6 rounded-[2rem] shadow-2xl animate-in fade-in zoom-in-95 border-b-4 border-blue-500/50">
            <div className="flex justify-between items-start mb-4">
               <div className="flex items-center gap-3 text-blue-400">
                  <div className="bg-blue-600/20 p-2 rounded-xl">
                    <Sparkles size={20} className="animate-pulse" />
                  </div>
                  <h3 className="font-bold">تحليل الاستخبارات الجغرافية</h3>
               </div>
               <button onClick={() => setAiAnalysis(null)} className="p-1 hover:bg-slate-800 rounded-full text-slate-500 transition-colors">
                  <X size={20} />
               </button>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">{aiAnalysis}</p>
          </div>
        )}

        {/* Map Control Buttons */}
        <MapControls 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isSatellite={isSatellite}
          setIsSatellite={setIsSatellite}
          onLocateUser={locateUser}
          isLocating={isLocating}
          assignments={assignments} 
          onAcceptAssignment={handleAcceptAssignment}
          hasActiveRoute={!!currentRoute || !!secondaryRoute}
          onClearRoute={handleStopNavigation}
          hasActiveCampaign={!!activeCampaign}
        />

        {/* Modal Manager */}
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
            currentUserId={userProfile?.id || ''}
            currentUserProfile={userProfile}
            onlineUsers={onlineUsers}
            allProfiles={allProfiles}
            showSettings={showSettings}
            closeSettings={() => setShowSettings(false)}
            user={session?.user}
            userRole={userRole}
            mapProvider={mapProvider}
            setMapProvider={setMapProvider}
            onOpenDatabaseFix={() => { setShowSettings(false); setShowDatabaseFix(true); }}
            commandUser={commandUser}
            closeCommandUser={() => setCommandUser(null)}
            onIntercept={handleIntercept}
            onDispatch={handleDispatch}
            showLocationPickerModal={showLocationPicker}
            closeLocationPicker={() => setShowLocationPicker(false)}
            notes={notes}
            onSelectDispatchLocation={handleSelectDispatchLocation}
            dispatchTargetLocation={dispatchTargetLocation}
            closeDispatchModal={() => setDispatchTargetLocation(null)}
            onSendDispatch={handleSendDispatchOrder}
            showFullLogs={showFullLogs}
            closeFullLogs={() => setShowFullLogs(false)}
            showCampaigns={showCampaigns}
            closeCampaigns={() => setShowCampaigns(false)}
            activeCampaign={activeCampaign}
            onStartCampaign={handleStartCampaign}
            onUpdateCampaign={handleUpdateCampaign}
            onFilterByUser={(uid, name) => {
                setTargetUserFilter({ id: uid, name });
                setShowDashboard(false);
            }}
            onLogout={handleLogout}
        />

        {/* DB Setup Warning */}
        {showDatabaseFix && <DatabaseSetupModal onClose={() => setShowDatabaseFix(false)} />}
      </div>
    </div>
  );
}
