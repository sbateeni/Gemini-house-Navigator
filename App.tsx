
import React, { useState, useEffect } from 'react';
import { useAppLogic } from './hooks/useAppLogic';
import { SourceSession, UserPermissions, UserProfile } from './types';
import { db } from './services/db';
import { Timer, LogOut, X, ShieldAlert, KeyRound } from 'lucide-react';

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
  // --- 1. CORE STATE ---
  const [sourceSession, setSourceSession] = useState<SourceSession | null>(null);
  const [sourceTimeLeft, setSourceTimeLeft] = useState<number>(0);
  const [showDatabaseFix, setShowDatabaseFix] = useState(false);

  // --- 2. AUTH & LOGIC HOOKS ---
  // Note: We access app logic, but some parts depend on authentication which Source users lack.
  // We will handle this by mocking necessary profile/permission data for the Source user.
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

  // --- 3. SOURCE MODE LOGIC ---
  
  // Specific permissions for Source Users
  const sourcePermissions: UserPermissions = {
      can_create: true,       // They can mark locations
      can_see_others: false,  // Hidden for security
      can_navigate: true,     // Can navigate to points
      can_edit_users: false,
      can_dispatch: false,
      can_view_logs: false
  };

  // Mock Profile for Source Users so components don't crash
  const sourceProfile: UserProfile | null = sourceSession ? {
      id: 'source-guest',
      username: sourceSession.label || 'مصدر سري',
      role: 'source',
      isApproved: true,
      permissions: sourcePermissions,
      email: 'source@secure-link'
  } : null;

  // Effective Data for Rendering
  const activeUserProfile = sourceSession ? sourceProfile : userProfile;
  const activePermissions = sourceSession ? sourcePermissions : permissions;
  const activeUserRole = sourceSession ? 'source' : userRole;
  
  // Filter Logic
  const displayedNotes = targetUserFilter 
    ? notes.filter(n => n.createdBy === targetUserFilter.id)
    : notes;

  const handleSourceLogin = async (session: SourceSession) => {
      setSourceSession(session);
      // Fetch notes immediately for this source code
      try {
          const fetchedNotes = await db.getAllNotes(undefined, session.code);
          setNotes(fetchedNotes);
      } catch (err: any) {
          console.error("Source fetch error:", err);
          if (err.code === 'TABLE_MISSING') alert("خطأ في قاعدة البيانات (Missing Columns).");
      }
  };

  const handleSourceLogout = () => {
      setSourceSession(null);
      setNotes([]);
      window.location.reload(); // Hard reload to clear any residual state
  };

  // Source Timer Logic
  useEffect(() => {
      if (!sourceSession) return;
      
      const interval = setInterval(() => {
          const left = Math.max(0, Math.ceil((sourceSession.expiresAt - Date.now()) / 1000));
          setSourceTimeLeft(left);
          
          if (left <= 0) {
              alert("انتهت صلاحية الكود. سيتم تسجيل الخروج.");
              handleSourceLogout();
          }
      }, 1000);
      
      return () => clearInterval(interval);
  }, [sourceSession]);

  // Handle Note Save for Sources (Bypassing standard auth check in hooks)
  const handleSourceSaveNote = async (visibility: 'public' | 'private', title?: string) => {
      if (!sourceSession || !tempCoords) return;
      
      const defaultName = visibility === 'public' ? 'موقع عام' : 'موقع خاص (مصدر)';
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
          await db.addNote(newNote);
          setNotes(prev => [newNote, ...prev]);
          closeModal();
          setUserNoteInput("");
      } catch(e) {
          alert("فشل الحفظ. ربما انتهت الصلاحية.");
      }
  };


  // --- 4. RENDER GUARDS ---
  
  if (authLoading && !sourceSession) return <LoadingScreen />;

  // Auth Page Entry
  if (!session && !sourceSession) return <AuthPage onSourceLogin={handleSourceLogin} />;

  // Pending Approval (Standard Users Only)
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

  // Database Error Modal
  if (tableMissing) return <DatabaseSetupModal />;

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden" dir="rtl">
      
      {showDatabaseFix && <DatabaseSetupModal onClose={() => setShowDatabaseFix(false)} />}

      {/* --- SOURCE MODE TACTICAL HUD --- */}
      {sourceSession && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[2000] flex flex-col items-center gap-2 animate-in slide-in-from-top-5">
              <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-1 shadow-2xl flex items-center gap-4 pr-6 pl-2">
                  
                  {/* Operation Info */}
                  <div className="flex items-center gap-3 py-2">
                      <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-500/30">
                        <KeyRound className="text-blue-400 w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">العملية النشطة</span>
                          <span className="text-sm font-bold text-white">{sourceSession.label || 'مهمة سرية'}</span>
                      </div>
                  </div>

                  <div className="h-8 w-px bg-slate-800"></div>

                  {/* Timer */}
                  <div className="flex flex-col items-center min-w-[80px]">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">المتبقي</span>
                      <div className={`font-mono text-xl font-bold leading-none ${sourceTimeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                          {Math.floor(sourceTimeLeft / 60)}:{(sourceTimeLeft % 60).toString().padStart(2, '0')}
                      </div>
                  </div>

                  <div className="h-8 w-px bg-slate-800"></div>

                  {/* Exit */}
                  <button 
                      onClick={handleSourceLogout}
                      className="bg-red-900/20 hover:bg-red-900/40 text-red-500 border border-red-900/30 p-2 rounded-lg transition-colors flex items-center justify-center"
                      title="إنهاء المهمة والخروج"
                  >
                      <LogOut size={18} />
                  </button>
              </div>
          </div>
      )}

      {/* Admin Filter Banner */}
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

      {/* Sidebar - Pass Source Props if needed */}
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
          onFlyToNote={flyToTarget ? () => {} : flyToNote} 
          onDeleteNote={handleDeleteNote}
          onEditNote={handleEditNote} 
          onNavigateToNote={(note) => {
              if (activePermissions.can_navigate) handleNavigateToNote(note, locateUser);
              else alert("غير مصرح بالملاحة.");
          }}
          onStopNavigation={() => { handleStopNavigation(); clearSecondaryRoute(); }}
          routeData={currentRoute}
          isRouting={isRouting}
          onAnalyzeNote={handleAnalyzeNote}
          isAnalyzing={isAnalyzing}
          onUpdateStatus={updateStatus}
          isConnected={isConnected}
          userRole={activeUserRole}
          onLogout={sourceSession ? handleSourceLogout : handleLogout}
          onOpenDashboard={() => setShowDashboard(true)} 
          onOpenSettings={() => setShowSettings(true)}
          onOpenCampaigns={() => setShowCampaigns(true)}
          canCreate={activePermissions.can_create} 
          myStatus={myStatus}
          setMyStatus={setMyStatus}
          onlineUsers={sourceSession ? [] : onlineUsers} 
          currentUserId={activeUserProfile?.id || ''}
      />

      <div className="flex-1 relative w-full h-full">
        {/* Tactical Overlay (Hidden for Source) */}
        {!sourceSession && (
            <TacticalOverlay 
                isSOS={isSOS}
                onToggleSOS={handleToggleSOS}
                onExpandLogs={() => setShowFullLogs(true)}
                distressedUser={distressedUser}
                onLocateSOS={handleLocateSOSUser}
            />
        )}
        
        {/* Simplified Overlay for Source (To hold Logs/Alerts if we wanted, but currently empty) */}
        {sourceSession && (
            <div className="absolute inset-0 z-10 pointer-events-none"></div>
        )}

        <LeafletMap 
          isSatellite={isSatellite}
          mapProvider={mapProvider}
          notes={displayedNotes} 
          selectedNote={selectedNote}
          setSelectedNote={setSelectedNote}
          onMapClick={(lat, lng) => {
              if (activePermissions.can_create) {
                 handleMapClick(lat, lng, handleStopNavigation);
              }
          }}
          flyToTarget={flyToTarget}
          tempMarkerCoords={tempCoords}
          userLocation={userLocation}
          currentRoute={currentRoute}
          secondaryRoute={secondaryRoute}
          otherUsers={sourceSession ? [] : onlineUsers} // Hide others from source
          onUserClick={onUserClick}
          canSeeOthers={activePermissions.can_see_others}
          onNavigate={(note) => {
             if (activePermissions.can_navigate) handleNavigateToNote(note, locateUser);
          }}
          onDispatch={handleOpenDispatchModal}
          userRole={activeUserRole}
          currentUserId={activeUserProfile?.id}
          isFlightMode={isFlightMode}
          flightHeading={flightHeading}
        />
        
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

        {/* Modal Container with Source-Aware Props */}
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
            currentUserId={activeUserProfile?.id || ''}
            currentUserProfile={activeUserProfile}
            
            showSettings={showSettings}
            closeSettings={() => setShowSettings(false)}
            user={sourceSession ? { email: 'source@secure', user_metadata: { username: sourceSession.label } } : session?.user}
            userRole={activeUserRole}
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
