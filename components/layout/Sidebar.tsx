import React, { useState, useEffect, useRef } from 'react';
import { MapNote, RouteData, UnitStatus, UserProfile, UserRole, MapUser, WantedStatus } from '../../types';
import { Wifi, WifiOff, XCircle, Navigation, Globe, Layers, Loader2, Eye, X } from 'lucide-react';
import { db } from '../../services/db';

import { SidebarHeader } from './sidebar/SidebarHeader';
import { SidebarTabs, TabId } from './sidebar/SidebarTabs';
import { SidebarUnits } from './sidebar/SidebarUnits';
import { SidebarNotes } from './sidebar/SidebarNotes';
import { NotificationBell } from '../../features/dispatch/NotificationBell';
import { SidebarLogs } from './sidebar/SidebarLogs';
import { SidebarSettings } from './sidebar/SidebarSettings';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  notes: MapNote[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearching: boolean;
  onSearch: (e: React.FormEvent) => void;
  onFlyToNote: (note: MapNote) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  onNavigateToNote: (note: MapNote) => void;
  onStopNavigation: () => void;
  routeData: RouteData | null;
  onUpdateStatus: (id: string, status: WantedStatus) => void;
  isConnected: boolean;
  userRole: UserRole | null;
  onLogout: () => void;
  onEditNote: (note: MapNote, e: React.MouseEvent) => void;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
  canCreate: boolean;
  myStatus: UnitStatus;
  setMyStatus: (s: UnitStatus) => void;
  onlineUsers: MapUser[];
  currentUserId?: string;
  onOpenCampaigns: () => void;
  // Map Controls
  isSatellite: boolean;
  setIsSatellite: (s: boolean) => void;
  onLocateUser: () => void;
  isLocating: boolean;
  assignments: any[];
  onAcceptAssignment: (id: string) => void;
  hasActiveRoute: boolean;
  onClearRoute: () => void;
  onExpandLogs: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen, setIsOpen, notes, searchQuery, setSearchQuery, isSearching, onSearch,
  onFlyToNote, onDeleteNote, onNavigateToNote, onStopNavigation, routeData,
  onUpdateStatus, isConnected, userRole, onLogout, onEditNote, onOpenDashboard, onOpenSettings, canCreate,
  myStatus, setMyStatus, onlineUsers, currentUserId, onOpenCampaigns,
  isSatellite, setIsSatellite, onLocateUser, isLocating, assignments, onAcceptAssignment,
  hasActiveRoute, onClearRoute,
  onExpandLogs,
}) => {
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [noteSearchQuery, setNoteSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('units');
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 768);

  const isAdmin = ['super_admin', 'governorate_admin', 'center_admin', 'admin'].includes(userRole || '');
  const isSource = userRole === 'source';

  useEffect(() => {
    if (!isAdmin || isSource) return;
    const fetchProfiles = () => { db.getAllProfiles().then(setAllProfiles); };
    fetchProfiles();
    const interval = setInterval(fetchProfiles, 60000);
    return () => clearInterval(interval);
  }, [isAdmin, isSource]);

  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isDesktop && !isOpen) setIsOpen(true);
  }, [isDesktop, isOpen, setIsOpen]);

  const [logsCount, setLogsCount] = useState(0);

  const renderTabContent = () => {
    switch (activeTab) {
      case 'units':
        return isSource ? (
          <div className="px-2 py-4 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 mb-2 text-slate-500">
              <Eye size={20} />
            </div>
            <p className="text-xs text-slate-500">تم إخفاء بيانات الوحدات الأخرى لأسباب أمنية</p>
          </div>
        ) : (
          <SidebarUnits onlineUsers={onlineUsers} allProfiles={allProfiles} currentUserId={currentUserId} />
        );
      case 'notes':
        return (
          <SidebarNotes
            notes={notes}
            canCreate={canCreate}
            onFlyToNote={onFlyToNote}
            onEditNote={onEditNote}
            onDeleteNote={onDeleteNote}
            onNavigateToNote={onNavigateToNote}
            onUpdateStatus={onUpdateStatus}
            noteSearchQuery={noteSearchQuery}
            setNoteSearchQuery={setNoteSearchQuery}
          />
        );
      case 'logs':
        return <SidebarLogs onExpandLogs={onExpandLogs} onCountChange={setLogsCount} />;
      case 'settings':
        return (
          <SidebarSettings
            isAdmin={isAdmin}
            onOpenDashboard={onOpenDashboard}
            onOpenSettings={onOpenSettings}
            onOpenCampaigns={onOpenCampaigns}
            onLogout={onLogout}
          />
        );
    }
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {!isDesktop && isOpen && (
        <div
          className="fixed inset-0 z-[1400] bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
      <div
        ref={sidebarRef}
        className={`
          fixed inset-y-0 right-0 z-[1500]
          w-[85vw] max-w-sm md:w-80
          bg-slate-900/95 backdrop-blur-xl
          border-l border-slate-800
          shadow-2xl
          transform transition-transform duration-300 ease-in-out
          flex flex-col text-right
          ${isDesktop || isOpen ? 'translate-x-0' : 'translate-x-full'}
          md:relative md:translate-x-0
        `}
      >
      {/* Mobile Close Button */}
      <div className="absolute top-3 left-3 md:hidden z-50">
        <button onClick={() => setIsOpen(false)} className="p-1.5 bg-slate-800/80 rounded-full text-white shadow-lg hover:bg-slate-700 active:scale-90 transition-all">
          <X size={18} />
        </button>
      </div>

      <SidebarHeader
        setIsOpen={setIsOpen}
        myStatus={myStatus}
        setMyStatus={setMyStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearching={isSearching}
        onSearch={onSearch}
      />

      {/* Map Controls + Connection Row */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/50 bg-slate-900/30 shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={onLocateUser}
            disabled={isLocating}
            className="w-7 h-7 bg-slate-800 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 rounded-lg flex items-center justify-center transition-all"
            title="موقعي"
          >
            {isLocating ? <Loader2 size={14} className="animate-spin" /> : <Navigation size={14} />}
          </button>
          <button
            onClick={() => setIsSatellite(!isSatellite)}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              isSatellite ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
            title="نمط الخريطة"
          >
            {isSatellite ? <Globe size={14} /> : <Layers size={14} />}
          </button>
          <NotificationBell assignments={assignments} onAccept={onAcceptAssignment} />
        </div>

        <div className="flex items-center gap-2">
          {hasActiveRoute && (
            <button onClick={onClearRoute} className="text-slate-500 hover:text-red-400 p-1" title="إلغاء المسار">
              <XCircle size={14} />
            </button>
          )}
          <div className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border ${
            isConnected ? 'bg-green-900/20 text-green-400 border-green-900/30' : 'bg-red-900/20 text-red-400 border-red-900/30'
          }`}>
            {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
            {isConnected ? 'مباشر' : 'غير متصل'}
          </div>
          {routeData && (
            <span className="text-[10px] font-mono text-blue-400 font-bold">{Math.round(routeData.distance / 1000)} km</span>
          )}
        </div>
      </div>

      <SidebarTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        counts={{ notes: notes.length, logs: logsCount }}
      />

      <div className="flex-1 overflow-y-auto p-2 space-y-2 scroll-smooth">
        {renderTabContent()}
      </div>
    </div>
  </>
  );
};
