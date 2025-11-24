import React, { useState, useEffect } from 'react';
import { MapNote, RouteData, UnitStatus, UserProfile } from '../types';
import { BookOpen, Search, Loader2, X, Map as MapIcon, Trash2, Globe, ExternalLink, Navigation2, Clock, Ruler, Sparkles, CheckCircle2, XCircle, LogOut, Shield, XSquare, Edit3, LayoutDashboard, Settings, CircleDot, Users, Wifi, WifiOff } from 'lucide-react';
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
  userRole: 'admin' | 'user' | 'banned' | null;
  onLogout: () => void;
  onEditNote: (note: MapNote, e: React.MouseEvent) => void;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
  canCreate: boolean;
  myStatus: UnitStatus;
  setMyStatus: (s: UnitStatus) => void;
  onlineUsers: any[]; // From usePresence
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

  // Fetch all profiles if admin (to show offline users too)
  useEffect(() => {
    if (userRole === 'admin') {
      db.getAllProfiles().then(setAllProfiles);
    }
  }, [userRole, isOpen]);

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
        {userRole === 'admin' && (
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
                        <div key={u.id} className={`flex items-center justify-between p-2 rounded-lg border ${isOnline ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-900/30 border-slate-800/50 opacity-60'}`}>
                             <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${statusColors[status as UnitStatus] || 'bg-slate-500'} ${isOnline ? 'animate-pulse' : ''}`}></div>
                                <span className="text-xs font-bold text-slate-300">{u.username}</span>
                             </div>
                             <span className="text-[10px] text-slate-500">{statusLabels[status as string] || 'غير متصل'}</span>
                        </div>
                    );
                })}
            </div>
        )}

        {/* --- NOTES LIST --- */}
        <h3 className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 flex items-center justify-between">
            <span>المواقع المحفوظة ({notes.length})</span>
            <MapIcon size={12} />
        </h3>

        {notes.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            لا توجد مواقع محفوظة حالياً.
          </div>
        ) : (
          notes.map(note => (
            <div 
              key={note.id}
              onClick={() => onFlyToNote(note)}
              className={`p-3 rounded-xl border cursor-pointer transition-all active:scale-[0.99] group relative 
                ${selectedNote?.id === note.id ? 'bg-blue-900/10 border-blue-500/40 ring-1 ring-blue-500/10' : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800'}
                ${getStatusStyle(note.status)}
              `}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-bold text-sm text-slate-200 truncate pl-16">
                  {note.locationName || "موقع محدد"}
                </h3>
                
                {/* Actions */}
                <div className="absolute left-2 top-2 flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                   {userRole === 'admin' && (
                        <>
                            <button onClick={(e) => onDeleteNote(note.id, e)} className="p-1.5 rounded hover:bg-red-900/30 text-slate-500 hover:text-red-400">
                                <Trash2 size={12} />
                            </button>
                            <button onClick={(e) => onEditNote(note, e)} className="p-1.5 rounded hover:bg-yellow-900/30 text-slate-500 hover:text-yellow-400">
                                <Edit3 size={12} />
                            </button>
                        </>
                   )}
                   <button 
                        onClick={(e) => { e.stopPropagation(); onUpdateStatus(note.id, note.status === 'caught' ? 'not_caught' : 'caught'); }}
                        className={`p-1.5 rounded ${note.status === 'caught' ? 'text-green-400' : 'text-slate-500 hover:text-green-400'}`}
                   >
                       {note.status === 'caught' ? <CheckCircle2 size={14} /> : <CircleDot size={14} />}
                   </button>
                </div>
              </div>

              <p className="text-xs text-slate-400 line-clamp-1 mb-2 leading-relaxed opacity-80">{note.userNote}</p>
              
              <div className="flex items-center justify-between">
                 <div className="flex gap-2 items-center">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onNavigateToNote(note);
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white px-2 py-0.5 rounded shadow-sm transition-colors"
                    >
                        <Navigation2 size={10} /> ذهاب
                    </button>
                 </div>
                 
                 <span className="text-[10px] text-slate-600 font-mono">
                    {new Date(note.createdAt).toLocaleDateString('en-GB')}
                 </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50 space-y-2">
         {userRole === 'admin' && (
           <div className="grid grid-cols-2 gap-2">
             <button onClick={onOpenDashboard} className="flex items-center justify-center gap-2 p-2 rounded-lg text-purple-400 bg-purple-900/10 hover:bg-purple-900/20 border border-purple-900/30 text-xs font-bold">
               <LayoutDashboard size={14} /> الإدارة
             </button>
             <button onClick={onOpenSettings} className="flex items-center justify-center gap-2 p-2 rounded-lg text-slate-400 hover:bg-slate-800 border border-slate-800 text-xs font-bold">
               <Settings size={14} /> الإعدادات
             </button>
           </div>
         )}
         <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-colors text-xs font-bold">
           <LogOut size={14} /> تسجيل خروج
         </button>
      </div>
    </div>
  );
};