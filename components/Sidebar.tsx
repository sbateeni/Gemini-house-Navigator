
import React, { useState, useEffect, useRef } from 'react';
import { MapNote, RouteData, UnitStatus, UserProfile, UserRole, MapUser } from '../types';
import { BookOpen, Search, Loader2, X, Map as MapIcon, Trash2, Globe, ExternalLink, Navigation2, Clock, Ruler, Sparkles, CheckCircle2, XCircle, LogOut, Shield, XSquare, Edit3, LayoutDashboard, Settings, CircleDot, Users, Wifi, WifiOff, MapPin } from 'lucide-react';
import { db } from '../services/db';

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
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  setIsOpen,
  notes,
  selectedNote,
  setSelectedNote,
  searchQuery,
  setSearchQuery,
  isSearching,
  onSearch,
  onFlyToNote,
  onDeleteNote,
  onNavigateToNote,
  onStopNavigation,
  routeData,
  isRouting,
  onAnalyzeNote,
  isAnalyzing,
  onUpdateStatus,
  isConnected,
  userRole,
  onLogout,
  onEditNote,
  onOpenDashboard,
  onOpenSettings,
  canCreate,
  myStatus,
  setMyStatus,
  onlineUsers
}) => {
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const isAdmin = ['super_admin', 'governorate_admin', 'center_admin', 'admin'].includes(userRole || '');

  // Fetch all profiles if admin (to show offline users too)
  useEffect(() => {
    if (isAdmin) {
      db.getAllProfiles().then(setAllProfiles);
    }
  }, [isAdmin, isOpen]);

  // --- AUTO CLOSE LOGIC ---
  useEffect(() => {
    if (!isOpen) return;

    let inactivityTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      // Set timeout to 10 seconds (10000ms)
      inactivityTimer = setTimeout(() => {
        setIsOpen(false);
      }, 10000);
    };

    // Start initial timer
    resetTimer();

    // Listen for activity inside the sidebar to reset the timer
    const sidebarElement = sidebarRef.current;
    const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll', 'click'];

    if (sidebarElement) {
      events.forEach(event => {
        sidebarElement.addEventListener(event, resetTimer);
      });
    }

    return () => {
      clearTimeout(inactivityTimer);
      if (sidebarElement) {
        events.forEach(event => {
          sidebarElement.removeEventListener(event, resetTimer);
        });
      }
    };
  }, [isOpen, setIsOpen]);

  const getStatusStyle = (status?: string) => {
    if (status === 'caught') return 'border-green-500/50 bg-green-900/10';
    if (status === 'not_caught') return 'border-red-500/50 bg-red-900/10';
    return '';
  };

  const statusColors = {
    patrol: 'bg-green-500',
    busy: 'bg-yellow-500',
    pursuit: 'bg-red-500',
    offline: 'bg-slate-500'
  };

  const statusLabels: Record<string, string> = {
    patrol: 'دورية',
    busy: 'مشغول',
    pursuit: 'مطاردة',
    offline: 'غير متصل'
  };

  // Merge Online status with All Profiles
  const onlineIds = new Set(onlineUsers.map(u => u.id));
  const sortedUsers = [...allProfiles].sort((a, b) => {
    const aOnline = onlineIds.has(a.id);
    const bOnline = onlineIds.has(b.id);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return 0;
  });

  return (
    <div 
      ref={sidebarRef}
      className={`
        fixed inset-y-0 right-0 z-[1000] 
        w-full md:w-80 
        bg-slate-900/95 backdrop-blur-xl 
        border-l border-slate-800 
        shadow-2xl 
        transform transition-transform duration-300 ease-in-out
        flex flex-col text-right
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        md:relative md:translate-x-0
        ${!isOpen && 'md:!w-0 md:!border-0'}
      `}
    >
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 bg-slate-800 rounded-lg text-slate-400 md:hidden hover:text-white"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3">
            <div>
              <h1 className="font-bold text-lg tracking-tight text-white leading-none mb-1">غرفة العمليات</h1>
              
              {/* Status Selector */}
              <div className="flex items-center gap-2 justify-end">
                 <div className="relative group">
                    <button className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2 py-0.5 text-[10px] font-bold text-slate-300 hover:bg-slate-700 transition-colors">
                        {statusLabels[myStatus]}
                        <div className={`w-2 h-2 rounded-full ${statusColors[myStatus]} animate-pulse`}></div>
                    </button>
                    <div className="absolute top-full right-0 mt-1 w-32 bg-slate-900 border border-slate-700 rounded-lg shadow-xl overflow-hidden hidden group-hover:block z-50">
                        {(['patrol', 'busy', 'pursuit'] as UnitStatus[]).map(s => (
                            <button 
                                key={s}
                                onClick={() => setMyStatus(s)}
                                className="w-full text-right px-3 py-2 text-xs font-bold hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-end gap-2"
                            >
                                {statusLabels[s]}
                                <div className={`w-2 h-2 rounded-full ${statusColors[s]}`}></div>
                            </button>
                        ))}
                    </div>
                 </div>
              </div>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Shield className="text-white w-6 h-6" />
            </div>
          </div>
        </div>
        
        {/* Search */}
        <form onSubmit={onSearch} className="relative">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن موقع..." 
            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-2.5 pr-10 pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-right"
            disabled={isSearching}
          />
          <Search className="absolute right-3 top-3 text-slate-500" size={16} />
          {isSearching && <Loader2 className="absolute left-3 top-3 text-blue-500 animate-spin" size={16} />}
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 scroll-smooth pb-24 md:pb-4">
        
        {/* Connection Status */}
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

        {/* --- UNITS LIST (ADMIN ONLY) --- */}
        {isAdmin && (
            <div className="mb-4 space-y-1">
                <h3 className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 flex items-center justify-between">
                    <span>حالة القوات ({onlineUsers.length} متصل)</span>
                    <Users size={12} />
                </h3>
                {sortedUsers.slice(0, 10).map(u => {
                    const isOnline = onlineIds.has(u.id);
                    const onlineUser = onlineUsers.find(ou => ou.id === u.id);
                    const status = onlineUser?.status || 'offline';
                    
                    return (
                        <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
                             <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${isOnline ? statusColors[status as keyof typeof statusColors] || 'bg-slate-500' : 'bg-slate-500'} ${isOnline ? 'animate-pulse' : ''}`}></div>
                                <div className="flex flex-col">
                                    <span className={`text-xs font-bold ${isOnline ? 'text-slate-200' : 'text-slate-500'}`}>{u.username}</span>
                                    {isOnline && <span className="text-[9px] text-slate-500">{statusLabels[status]}</span>}
                                </div>
                             </div>
                             {isOnline && (
                                <div className="flex gap-1">
                                    {/* Additional unit actions could go here */}
                                </div>
                             )}
                        </div>
                    );
                })}
            </div>
        )}

        {/* --- NOTES LIST --- */}
        <div className="mt-2">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-2 flex items-center justify-between">
                <span>المواقع المسجلة ({notes.length})</span>
                <MapIcon size={12} />
            </h3>
            
            {notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-600 opacity-60">
                    <BookOpen size={32} strokeWidth={1.5} />
                    <p className="text-xs mt-2">لا توجد ملاحظات مسجلة</p>
                </div>
            ) : (
                <div className="space-y-2 pb-20">
                    {notes.map(note => (
                        <div 
                           key={note.id}
                           onClick={() => onFlyToNote(note)}
                           className={`relative p-3 rounded-xl border transition-all cursor-pointer group ${selectedNote?.id === note.id ? 'bg-blue-900/20 border-blue-500/50' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'}`}
                        >
                            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${getStatusStyle(note.status).includes('green') ? 'bg-green-500' : getStatusStyle(note.status).includes('red') ? 'bg-red-500' : 'bg-slate-600'}`}></div>
                            
                            <div className="pl-3">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                       <MapPin size={14} className={selectedNote?.id === note.id ? "text-blue-400" : "text-slate-500"} />
                                       <h4 className={`text-sm font-bold ${selectedNote?.id === note.id ? 'text-blue-400' : 'text-slate-200'}`}>{note.locationName}</h4>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {canCreate && (
                                            <button onClick={(e) => onEditNote(note, e)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><Edit3 size={12} /></button>
                                        )}
                                        <button onClick={(e) => onDeleteNote(note.id, e)} className="p-1 hover:bg-red-900/30 rounded text-slate-400 hover:text-red-400"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                                
                                <p className="text-xs text-slate-400 line-clamp-2 mb-2">{note.userNote}</p>
                                
                                <div className="flex items-center gap-2 mt-2">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); onNavigateToNote(note); }}
                                        className="flex-1 bg-slate-700/50 hover:bg-blue-600/20 hover:text-blue-400 text-slate-400 text-[10px] py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
                                     >
                                        <Navigation2 size={10} /> ذهاب
                                     </button>
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); onAnalyzeNote(note); }}
                                        disabled={isAnalyzing}
                                        className="flex-1 bg-slate-700/50 hover:bg-purple-600/20 hover:text-purple-400 text-slate-400 text-[10px] py-1.5 rounded flex items-center justify-center gap-1 transition-colors"
                                     >
                                        {isAnalyzing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} 
                                        {note.aiAnalysis ? 'تحليل' : 'تحليل'}
                                     </button>
                                </div>
                                
                                {/* Status Toggles */}
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-700/30">
                                    <div className="flex gap-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onUpdateStatus(note.id, 'caught'); }}
                                            className={`p-1 rounded ${note.status === 'caught' ? 'text-green-400 bg-green-900/20' : 'text-slate-600 hover:text-green-400'}`}
                                        >
                                            <CheckCircle2 size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onUpdateStatus(note.id, 'not_caught'); }}
                                            className={`p-1 rounded ${note.status === 'not_caught' ? 'text-red-400 bg-red-900/20' : 'text-slate-600 hover:text-red-400'}`}
                                        >
                                            <XSquare size={14} />
                                        </button>
                                    </div>
                                    <span className="text-[10px] text-slate-600 font-mono">
                                       {new Date(note.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      </div>
      
      {/* Footer */}
      <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
           <div className="grid grid-cols-2 gap-2">
                {isAdmin && (
                    <button onClick={onOpenDashboard} className="flex items-center justify-center gap-1 bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 border border-purple-900/50 py-2 rounded-lg text-xs font-bold transition-all">
                        <LayoutDashboard size={14} /> القيادة
                    </button>
                )}
                <button onClick={onOpenSettings} className={`flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 py-2 rounded-lg text-xs font-bold transition-all ${!isAdmin ? 'col-span-2' : ''}`}>
                    <Settings size={14} /> الإعدادات
                </button>
           </div>
           <button onClick={onLogout} className="w-full flex items-center justify-center gap-1 text-red-400 hover:bg-red-900/10 py-2 rounded-lg text-xs font-bold transition-colors">
               <LogOut size={14} /> تسجيل الخروج
           </button>
      </div>
    </div>
  );
};
