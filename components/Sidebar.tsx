
import React, { useState, useEffect, useRef } from 'react';
import { MapNote, RouteData, UnitStatus, UserProfile, UserRole, MapUser } from '../types';
import { Wifi, WifiOff, XCircle, ShieldCheck, X, Eye } from 'lucide-react';
import { db } from '../services/db';

import { SidebarHeader } from './sidebar/SidebarHeader';
import { SidebarUnits } from './sidebar/SidebarUnits';
import { SidebarNotes } from './sidebar/SidebarNotes';
import { SidebarFooter } from './sidebar/SidebarFooter';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  notes: MapNote[];
  selectedNote: MapNote | null;
  setSelectedNote: (note: MapNote | null) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearching: boolean;
  onSearch: (e: React.FormEvent) => void;
  onFlyToNote: (note: MapNote) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  onNavigateToNote: (note: MapNote) => void;
  onStopNavigation: () => void;
  routeData: RouteData | null;
  isRouting: boolean;
  onAnalyzeNote: (note: MapNote) => void;
  isAnalyzing: boolean;
  onUpdateStatus: (id: string, status: 'caught' | 'not_caught') => void;
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
  currentUserId: string;
  onOpenCampaigns: () => void; 
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen, setIsOpen, notes, selectedNote, setSelectedNote, searchQuery, setSearchQuery, isSearching, onSearch,
  onFlyToNote, onDeleteNote, onNavigateToNote, onStopNavigation, routeData, isRouting, onAnalyzeNote, isAnalyzing,
  onUpdateStatus, isConnected, userRole, onLogout, onEditNote, onOpenDashboard, onOpenSettings, canCreate,
  myStatus, setMyStatus, onlineUsers, currentUserId, onOpenCampaigns
}) => {
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [noteSearchQuery, setNoteSearchQuery] = useState(""); 
  const sidebarRef = useRef<HTMLDivElement>(null);

  const isAdmin = ['super_admin', 'governorate_admin', 'center_admin', 'admin'].includes(userRole || '');
  const isSource = userRole === 'source';

  useEffect(() => {
    if (!isAdmin || isSource) return;

    const fetchProfiles = () => {
        db.getAllProfiles().then(setAllProfiles);
    };

    fetchProfiles(); 
    const interval = setInterval(fetchProfiles, 60000); 

    return () => clearInterval(interval);
  }, [isAdmin, isSource]);

  useEffect(() => {
    if (!isOpen) return;
    let inactivityTimer: ReturnType<typeof setTimeout>;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => { setIsOpen(false); }, 10000);
    };
    resetTimer();
    const sidebarElement = sidebarRef.current;
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'click'];
    if (sidebarElement) {
      events.forEach(event => { sidebarElement.addEventListener(event, resetTimer); });
    }
    return () => {
      clearTimeout(inactivityTimer);
      if (sidebarElement) {
        events.forEach(event => { sidebarElement.removeEventListener(event, resetTimer); });
      }
    };
  }, [isOpen, setIsOpen]);

  return (
    <div 
      ref={sidebarRef}
      className={`
        fixed inset-y-0 right-0 z-[1500] 
        w-full md:w-80 
        bg-slate-900/95 backdrop-blur-xl 
        border-l border-slate-800 
        shadow-2xl 
        transform transition-transform duration-300 ease-in-out
        flex flex-col text-right
        pb-16 /* Added padding to clear the operations log bar */
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        md:relative md:translate-x-0
        ${!isOpen && 'md:!w-0 md:!border-0'}
      `}
    >
      {/* Mobile Close Button */}
      <div className="absolute top-4 left-4 md:hidden z-50">
           <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-800 rounded-full text-white shadow-lg">
              <X size={20} />
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

      {isSource && (
          <div className="mx-2 mt-2 p-3 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center justify-center gap-3">
               <div className="bg-blue-500/10 p-1.5 rounded-lg border border-blue-500/20">
                   <ShieldCheck size={18} className="text-blue-400" />
               </div>
               <div className="flex flex-col items-start">
                   <span className="text-slate-200 text-xs font-bold">وضع المصدر الآمن</span>
                   <span className="text-slate-500 text-[10px]">اتصال مشفر ومؤقت</span>
               </div>
          </div>
      )}

      <div className="flex-1 overflow-y-auto p-2 space-y-2 scroll-smooth">
        
        <div className="flex items-center justify-between px-2 mb-2">
            <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${isConnected ? 'bg-green-900/20 text-green-400 border-green-900/30' : 'bg-red-900/20 text-red-400 border-red-900/30'}`}>
                {isConnected ? <Wifi size={10} /> : <WifiOff size={10} />}
                {isConnected ? 'متصل بالسحابة' : 'وضع غير متصل'}
            </div>

            {routeData && (
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-blue-400 font-bold">
                        {Math.round(routeData.distance / 1000)} km
                    </span>
                    <button onClick={onStopNavigation} className="text-slate-500 hover:text-red-400">
                        <XCircle size={14} />
                    </button>
                </div>
            )}
        </div>

        {/* Hide Units for Source, but maybe show a placeholder so it looks populated? */}
        {!isSource ? (
            <SidebarUnits onlineUsers={onlineUsers} allProfiles={allProfiles} />
        ) : (
            <div className="px-2 py-4 text-center border-b border-slate-800/50 mb-2">
                <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 mb-2 text-slate-500">
                    <Eye size={20} />
                </div>
                <p className="text-xs text-slate-500">
                    تم إخفاء بيانات الوحدات الأخرى<br/>لأسباب أمنية
                </p>
            </div>
        )}

        <SidebarNotes 
            notes={notes}
            selectedNote={selectedNote}
            canCreate={canCreate}
            isAnalyzing={isAnalyzing}
            onFlyToNote={onFlyToNote}
            onEditNote={onEditNote}
            onDeleteNote={onDeleteNote}
            onNavigateToNote={onNavigateToNote}
            onAnalyzeNote={onAnalyzeNote}
            onUpdateStatus={onUpdateStatus}
            noteSearchQuery={noteSearchQuery}
            setNoteSearchQuery={setNoteSearchQuery}
        />
      </div>
      
      <SidebarFooter 
        isAdmin={isAdmin}
        onOpenDashboard={onOpenDashboard}
        onOpenSettings={onOpenSettings}
        onOpenCampaigns={onOpenCampaigns}
        onLogout={onLogout}
      />
    </div>
  );
};
