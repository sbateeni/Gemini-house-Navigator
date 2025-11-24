import React from 'react';
import { MapNote, RouteData } from '../types';
import { BookOpen, Search, Loader2, X, Map as MapIcon, Trash2, Globe, ExternalLink, Navigation2, Clock, Ruler, Sparkles, CheckCircle2, XCircle, LogOut, Shield, XSquare } from 'lucide-react';

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
  userRole: 'admin' | 'user' | null;
  onLogout: () => void;
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
  onLogout
}) => {
  
  const formatDuration = (seconds: number) => {
    const min = Math.round(seconds / 60);
    if (min > 60) {
      const hrs = Math.floor(min / 60);
      const mins = min % 60;
      return `${hrs}h ${mins}m`;
    }
    return `${min} min`;
  };

  const formatDistance = (meters: number) => {
    if (meters > 1000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${Math.round(meters)} m`;
  };

  const getStatusStyle = (status?: string) => {
    if (status === 'caught') return 'border-green-500/50 bg-green-900/10';
    if (status === 'not_caught') return 'border-red-500/50 bg-red-900/10';
    return '';
  };

  return (
    <div 
      className={`
        fixed inset-y-0 left-0 z-[1000] 
        w-full md:w-96 
        bg-slate-900/95 backdrop-blur-xl 
        border-r border-slate-800 
        shadow-2xl 
        transform transition-transform duration-300 ease-in-out
        flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        md:relative md:translate-x-0
        ${!isOpen && 'md:!w-0 md:!border-0'}
      `}
    >
      {/* Sidebar Header */}
      <div className="p-4 pt-6 md:pt-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <BookOpen className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-xl tracking-tight text-white leading-none mb-1">Map Journal</h1>
              {/* Connection Status Indicator */}
              <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse' : 'bg-red-500'}`}></div>
                 <span className={`text-[10px] font-bold uppercase tracking-wider ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                    {isConnected ? 'Cloud Online' : 'Offline'}
                 </span>
                 {userRole === 'admin' && (
                     <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-900/30 px-1.5 py-0.5 rounded ml-2">
                        <Shield size={10} /> Admin
                     </span>
                 )}
              </div>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button 
            onClick={() => setIsOpen(false)}
            className="p-2 bg-slate-800 rounded-lg text-slate-400 md:hidden hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Search Box */}
        <form onSubmit={onSearch} className="relative">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search anywhere..." 
            className="w-full bg-slate-950/50 border border-slate-700 rounded-xl py-3 pl-10 pr-10 text-base text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner"
            disabled={isSearching}
          />
          <Search className="absolute left-3 top-3.5 text-slate-500" size={18} />
          
          {isSearching ? (
            <Loader2 className="absolute right-3 top-3.5 text-blue-500 animate-spin" size={18} />
          ) : searchQuery && (
            <button 
              type="button" 
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-3.5 text-slate-500 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </form>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth pb-24 md:pb-4">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 px-8 text-center">
            <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
              <MapIcon className="w-8 h-8 opacity-40" />
            </div>
            <h3 className="text-white font-medium mb-1">Start your journey</h3>
            <p className="text-sm">Tap anywhere on the map to drop a pin. Notes are synced globally.</p>
          </div>
        ) : (
          notes.map(note => (
            <div 
              key={note.id}
              onClick={() => onFlyToNote(note)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all active:scale-[0.98] group relative 
                ${selectedNote?.id === note.id ? 'bg-blue-900/20 border-blue-500/50 shadow-lg ring-1 ring-blue-500/20' : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'}
                ${getStatusStyle(note.status)}
              `}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-base text-blue-100 truncate pr-20">
                  {note.locationName}
                </h3>
                
                {/* Action Buttons Row */}
                <div className="absolute right-3 top-3 flex items-center gap-1">
                  
                  {/* Status Buttons */}
                  <div className="flex bg-slate-900/50 rounded-lg p-0.5 border border-slate-700/50 mr-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onUpdateStatus(note.id, 'caught'); }}
                        className={`p-1.5 rounded-md transition-colors ${note.status === 'caught' ? 'bg-green-600 text-white shadow-sm' : 'text-slate-500 hover:text-green-400 hover:bg-slate-800'}`}
                        title="Caught"
                    >
                        <CheckCircle2 size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onUpdateStatus(note.id, 'not_caught'); }}
                        className={`p-1.5 rounded-md transition-colors ${note.status === 'not_caught' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-red-400 hover:bg-slate-800'}`}
                        title="Not Caught"
                    >
                        <XCircle size={16} />
                    </button>
                  </div>

                  {/* Delete Button (Admin Only) */}
                  {userRole === 'admin' && (
                    <button 
                        onClick={(e) => onDeleteNote(note.id, e)} 
                        className="p-2 rounded-lg hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors border border-transparent hover:border-red-900/50"
                        title="Delete (Admin Only)"
                    >
                        <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm text-slate-400 line-clamp-2 mb-3 leading-relaxed">"{note.userNote}"</p>
              
              <div className="flex items-center justify-between mt-2">
                 <div className="flex gap-2">
                    <span className="text-[10px] font-medium bg-slate-800 px-2 py-1 rounded-full text-slate-500 border border-slate-700">
                        {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                    {note.status === 'caught' && (
                        <span className="text-[10px] font-bold bg-green-900/30 text-green-400 px-2 py-1 rounded-full border border-green-900/50">
                            Caught
                        </span>
                    )}
                    {note.status === 'not_caught' && (
                        <span className="text-[10px] font-bold bg-red-900/30 text-red-400 px-2 py-1 rounded-full border border-red-900/50">
                            Not Caught
                        </span>
                    )}
                 </div>

                 {!note.aiAnalysis && (
                   <span className="flex items-center gap-1 text-[10px] text-yellow-500/80">
                     <Sparkles size={10} /> Needs Analysis
                   </span>
                 )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Logout Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/50">
         <button 
           onClick={onLogout}
           className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition-colors text-sm"
         >
           <LogOut size={16} /> Sign Out
         </button>
      </div>

      {/* Selected Note Detail View */}
      {selectedNote && (
        <div className="p-5 border-t border-slate-800 bg-slate-900 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2 text-blue-500">
               <Globe size={14} />
               <span className="text-xs uppercase tracking-wider font-bold">
                 {selectedNote.aiAnalysis ? "Verified Location" : "Coordinates Saved"}
               </span>
             </div>
             <button onClick={() => setSelectedNote(null)} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded-full">
               <X size={14} />
             </button>
          </div>
          <h2 className="font-bold text-xl text-white mb-2">{selectedNote.locationName}</h2>
          
          {/* Action Buttons: Navigate & Analyze */}
          <div className="mb-4 space-y-2">
             {/* Navigation Status */}
             {routeData && selectedNote ? (
               <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-3 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
                 <div className="flex gap-4">
                   <div className="flex items-center gap-1.5 text-green-400">
                     <Clock size={16} />
                     <span className="font-mono font-bold">{formatDuration(routeData.duration)}</span>
                   </div>
                   <div className="flex items-center gap-1.5 text-green-400">
                     <Ruler size={16} />
                     <span className="font-mono font-bold">{formatDistance(routeData.distance)}</span>
                   </div>
                 </div>
                 <button 
                   onClick={onStopNavigation}
                   className="bg-red-900/30 hover:bg-red-900/50 text-red-400 p-1.5 rounded-lg transition-colors"
                   title="Stop Navigation"
                 >
                   <XSquare size={18} />
                 </button>
               </div>
             ) : (
                <button 
                  onClick={() => onNavigateToNote(selectedNote)}
                  disabled={isRouting}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors border border-slate-700"
                >
                  {isRouting ? <Loader2 className="animate-spin" size={18} /> : <Navigation2 size={18} />}
                  Navigate Here
                </button>
             )}

             {/* Analyze Button (Only if not analyzed) */}
             {!selectedNote.aiAnalysis && (
               <button 
                  onClick={() => onAnalyzeNote(selectedNote)}
                  disabled={isAnalyzing}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-2 rounded-lg flex items-center justify-center gap-2 font-medium transition-all shadow-lg shadow-blue-900/20"
                >
                  {isAnalyzing ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                  Identify with AI
                </button>
             )}
          </div>

          <div className="max-h-32 overflow-y-auto mb-4 pr-2 scrollbar-thin">
            {selectedNote.aiAnalysis ? (
              <p className="text-sm text-slate-300 leading-relaxed">
                {selectedNote.aiAnalysis}
              </p>
            ) : (
              <p className="text-sm text-slate-500 italic">
                Location saved. Use the AI button to identify this place and get details.
              </p>
            )}
          </div>
          
          {selectedNote.sources && selectedNote.sources.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800">
              {selectedNote.sources.map((s, i) => (
                <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-slate-400 hover:text-blue-400 border border-slate-700 transition-colors">
                  <ExternalLink size={12} /> {s.title}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};