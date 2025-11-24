import React from 'react';
import { MapNote } from '../types';
import { BookOpen, Search, Loader2, X, Map as MapIcon, Trash2, Globe, ExternalLink } from 'lucide-react';

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
  onDeleteNote
}) => {
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
              <h1 className="font-bold text-xl tracking-tight text-white">Map Journal</h1>
              <p className="text-xs text-slate-400">Gemini + Maps</p>
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
            <p className="text-sm">Tap anywhere on the map to drop a pin and write a note.</p>
          </div>
        ) : (
          notes.map(note => (
            <div 
              key={note.id}
              onClick={() => onFlyToNote(note)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all active:scale-[0.98] group relative ${selectedNote?.id === note.id ? 'bg-blue-900/20 border-blue-500/50 shadow-lg ring-1 ring-blue-500/20' : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className="font-semibold text-base text-blue-100 truncate pr-6">{note.locationName}</h3>
                <button 
                  onClick={(e) => onDeleteNote(note.id, e)} 
                  className="absolute right-3 top-4 p-1.5 rounded-full hover:bg-red-900/30 text-slate-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <p className="text-sm text-slate-400 line-clamp-2 mb-3 leading-relaxed">"{note.userNote}"</p>
              <div className="flex items-center justify-between mt-2">
                 <span className="text-[10px] font-medium bg-slate-800 px-2 py-1 rounded-full text-slate-500">
                    {new Date(note.createdAt).toLocaleDateString()}
                 </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Selected Note Detail View */}
      {selectedNote && (
        <div className="p-5 border-t border-slate-800 bg-slate-900 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          <div className="flex justify-between items-center mb-3">
             <div className="flex items-center gap-2 text-blue-500">
               <Globe size={14} />
               <span className="text-xs uppercase tracking-wider font-bold">AI Analysis</span>
             </div>
             <button onClick={() => setSelectedNote(null)} className="text-slate-400 hover:text-white bg-slate-800 p-1 rounded-full">
               <X size={14} />
             </button>
          </div>
          <h2 className="font-bold text-xl text-white mb-2">{selectedNote.locationName}</h2>
          <div className="max-h-32 overflow-y-auto mb-4 pr-2 scrollbar-thin">
            <p className="text-sm text-slate-300 leading-relaxed">
              {selectedNote.aiAnalysis}
            </p>
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