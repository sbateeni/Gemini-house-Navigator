
import React, { useState, useEffect, useRef } from 'react';
import { MapNote, RouteData, UnitStatus, UserProfile, UserRole, MapUser } from '../types';
import { Wifi, WifiOff, XCircle, ShieldCheck, X } from 'lucide-react';
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

  // --- SOURCE MODE VIEW ---
  if (isSource) {
      return (
        <div 
            className={`
                fixed inset-y-0 right-0 z-[1500] 
                w-full md:w-80 
                bg-slate-900/95 backdrop-blur-xl 
                border-l border-slate-800 
                shadow-2xl 
                transform transition-transform duration-300 ease-in-out
                flex flex-col text-right
                pb-0
                ${isOpen ? 'translate-x-0' : 'translate-x-full'}
                md:translate-x-0 md:relative
            `}
        >
            {/* Close Button for Mobile */}
            <div className="absolute top-4 left-4 md:hidden z-50">
               <button onClick={() => setIsOpen(false)} className="p-2 bg-slate-800 rounded-full text-white shadow-lg">
                  <X size={20} />
               </button>
            </div>

            <div className="p-6 flex-1 flex flex-col items-center justify-center text-center space-y-4">
                <div className="w-16 h-16 bg-green-900/20 rounded-full flex items-center justify-center border border-green-500/30 animate-pulse">
                    <ShieldCheck size={32} className="text-green-500" />
                </div>
                <h2 className="text-xl font-bold text-white">وضع المصدر الآمن</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                    يمكنك إضافة المواقع بالنقر على الخريطة. <br/>
                    لا يتم عرض البيانات المسجلة هنا لسلامتك.
                </p>
                <div className="mt-4 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50 text-xs text-slate-400">
                    عدد المواقع المسجلة: <span className="text-green-400 font-bold">{notes.length}</span>
                </div>
            </div>
            
            <SidebarFooter 
                isAdmin={false}
                onOpenDashboard={() => {}}
                onOpenSettings={() => {}}
                onOpenCampaigns={() => {}}
                onLogout={onLogout}
            />
        </div>
      );
  }

  // --- STANDARD VIEW ---
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
        pb-0
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        md:relative md:translate-x-0
        ${!isOpen && 'md:!w-0 md:!border-0'}
      `}
    >
      <SidebarHeader 
        setIsOpen={setIsOpen} 
        myStatus={myStatus} 
        setMyStatus={setMyStatus}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        isSearching={isSearching}
        onSearch={onSearch}
      />

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

        <SidebarUnits onlineUsers={onlineUsers} allProfiles={allProfiles} />

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
