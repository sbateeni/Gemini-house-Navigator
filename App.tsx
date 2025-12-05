
import React, { useState, useEffect } from 'react';
import { useAppLogic } from './hooks/useAppLogic';
import { SourceSession } from './types';
import { db } from './services/db';
import { Timer, LogOut, X, ShieldAlert } from 'lucide-react';

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
  const [showDatabaseFix, setShowDatabaseFix] = useState(false);

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
    showCampaigns, setShowCampaigns,
    commandUser, setCommandUser, onUserClick, handleIntercept, handleDispatch,
    showLocationPicker, setShowLocationPicker, handleSelectDispatchLocation,
    dispatchTargetLocation, setDispatchTargetLocation, handleOpenDispatchModal, handleSendDispatchOrder,
    showModal, tempCoords, userNoteInput, setUserNoteInput, isEditingNote,
    handleMapClick, handleEditNote, handleSaveNote, closeModal,
    targetUserFilter, setTargetUserFilter,
    // Flight Props
    isFlightMode, setIsFlightMode, flightHeading
  } = useAppLogic();

  // --- Filter Logic ---
  const displayedNotes = targetUserFilter 
    ? notes.filter(n => n.createdBy === targetUserFilter.id)
    : notes;

  // --- Source Logic ---
  const handleSourceLogin = (session: SourceSession) => {
      setSourceSession(session);
      // Fetch Source notes
      db.getAllNotes(undefined, session.code)
        .then(setNotes)
        .catch(err => {
            console.error("Source login data fetch error:", err);
            // If table/column missing, alert user (Sources can't fix it, but should know)
            if (err.code === 'TABLE_MISSING') {
                alert("نظام غير محدث: يرجى التواصل مع المسؤول لتحديث قاعدة البيانات (Missing Columns).");
            }
        });
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
  const handleSourceSaveNote = async (visibility: 'public' | 'private', title?: string) => {
      if (!sourceSession || !tempCoords) return;
      
      const defaultName = visibility === 'public' ? 'موقع عام' : 'موقع خاص (مصدر)';
      // Use the provided title or the default
      const locationName = title?.trim() ? title : defaultName;

      const newNote = {
          id: crypto.randomUUID(),
          lat: tempCoords.lat,
          lng: tempCoords.lng,
          userNote: userNoteInput,
          locationName: locationName,
          aiAnalysis: "",
          sources: [],
          createdAt: Date.now(),
          status: 'not_caught' as const,
          accessCode: sourceSession.code,
          visibility: visibility
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

  // Auto-show DB Setup if critical tables missing
  if (tableMissing) return <DatabaseSetupModal />;

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden" dir="rtl">
      
      {/* Manual DB Fix Modal */}
      {showDatabaseFix && <DatabaseSetupModal onClose={() => setShowDatabaseFix(false)} />}

      {/* Source Mode Timer Overlay - REDESIGNED TO LOOK LIKE OPS CREW UI */}
      {sourceSession && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] flex flex-col items-center gap-2">
              <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl px-5 py-2 shadow-2xl flex items-center gap-6">
                  <div className="flex items-center gap-3">
                      <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
                        <ShieldAlert className="text-blue-400 w-5 h-5 animate-pulse" />
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">الزمن المتبقي للمهمة</span>
                          <div className="flex items-center gap-2 font-mono text-xl font-bold text-white leading-none">
                              <span>
                                  {Math.floor(sourceTimeLeft / 60)}:{(sourceTimeLeft % 60).toString().padStart(2, '0')}
                              </span>
                          </div>
                      </div>
                  </div>

                  <div className="h-8 w-px bg-slate-700"></div>

                  <button 
                      onClick={handleSourceLogout}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold"
                      title="إنهاء المهمة"
                  >
                      <LogOut size={16} />
                      <span>خروج</span>
                  </button>
              </div>
          </div>
      )}

      {/* Admin Filter Active Banner */}
      {targetUserFilter && (
         <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[1000] bg-purple-900/90 border border-purple-500 rounded-full pl-2 pr-6 py-2 shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-10">
             <span className="text-white text-sm font-bold">
                 تصفية المواقع للمستخدم: <span className="text-yellow-300">{targetUserFilter.name}</span>
             </span>
             <button 
                 onClick={() => setTargetUserFilter(null)}
                 className="p-1 bg-purple-800 hover:bg-purple-700 rounded-full text-white"
             >
                 <X size={16} />
             </button>
         </div>
      )}

      {/* Sidebar */}
      <Sidebar 
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          notes={displayedNotes} 
          selectedNote={selectedNote}
          setSelectedNote={setSelectedNote}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isSearching={isSearching}
          onSearch={handleSearch}
          onFlyToNote={flyToTarget ? () => {} : flyToNote} // Fix flight override
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
          onOpenCampaigns={() => setShowCampaigns(true)}
          canCreate={!!sourceSession || permissions.can_create} 
          myStatus={myStatus}
          setMyStatus={setMyStatus}
          onlineUsers={sourceSession ? [] : onlineUsers} 
          currentUserId={session?.user?.id || ''}
      />

      <div className="flex-1 relative w-full h-full">
        {/* Tactical Overlay */}
        {!sourceSession && (
            <TacticalOverlay 
                isSOS={isSOS}
                onToggleSOS={handleToggleSOS}
                onExpandLogs={() => setShowFullLogs(true)}
                distressedUser={distressedUser}
                onLocateSOS={handleLocateSOSUser}
            />
        )}
        
        {/* Source Mode Overlay (Simplified) */}
        {sourceSession && (
            <div className="absolute inset-0 z-10 pointer-events-none">
                 <TacticalOverlay 
                    isSOS={false} onToggleSOS={() => {}} onExpandLogs={() => {}}
                 />
            </div>
        )}

        <LeafletMap 
          isSatellite={isSatellite}
          mapProvider={mapProvider}
          notes={displayedNotes} 
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
          otherUsers={sourceSession ? [] : onlineUsers}
          onUserClick={onUserClick}
          canSeeOthers={!sourceSession && permissions.can_see_others}
          onNavigate={(note) => {
             if (sourceSession || permissions.can_navigate) handleNavigateToNote(note, locateUser);
             else alert("صلاحية الملاحة مرفوضة.");
          }}
          onDispatch={handleOpenDispatchModal}
          userRole={sourceSession ? 'source' : userRole}
          currentUserId={session?.user?.id}
          isFlightMode={isFlightMode}
          flightHeading={flightHeading}
        />
        
        {/* Controls layer */}
        <MapControls 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isSatellite={isSatellite}
          setIsSatellite={setIsSatellite}
          onLocateUser={locateUser}
          isLocating={isLocating}
          assignments={sourceSession ? [] : assignments} 
          onAcceptAssignment={handleAcceptAssignment}
          hasActiveRoute={!!currentRoute || !!secondaryRoute}
          onClearRoute={() => {
              handleStopNavigation();
              clearSecondaryRoute();
          }}
          isFlightMode={isFlightMode}
          setIsFlightMode={setIsFlightMode}
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
            onOpenDatabaseFix={() => { setShowSettings(false); setShowDatabaseFix(true); }}
            
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

            showCampaigns={showCampaigns}
            closeCampaigns={() => setShowCampaigns(false)}

            onFilterByUser={(uid, name) => {
                setTargetUserFilter({ id: uid, name });
                setShowDashboard(false);
            }}

            onLogout={sourceSession ? handleSourceLogout : handleLogout}
        />
      </div>
    </div>
  );
}
