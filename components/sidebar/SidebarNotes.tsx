
import React, { useState } from 'react';
import { MapIcon, BookOpen, MapPin, Edit3, Trash2, Navigation2, Loader2, Sparkles, CheckCircle2, XSquare, Search, SortAsc, Calendar, Globe, Lock } from 'lucide-react';
import { MapNote } from '../../types';

interface SidebarNotesProps {
  notes: MapNote[];
  selectedNote: MapNote | null;
  canCreate: boolean;
  isAnalyzing: boolean;
  onFlyToNote: (n: MapNote) => void;
  onEditNote: (n: MapNote, e: React.MouseEvent) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  onNavigateToNote: (n: MapNote) => void;
  onAnalyzeNote: (n: MapNote) => void;
  onUpdateStatus: (id: string, s: 'caught' | 'not_caught') => void;
  noteSearchQuery: string; 
  setNoteSearchQuery: (q: string) => void; 
}

export const SidebarNotes: React.FC<SidebarNotesProps> = ({
  notes, selectedNote, canCreate, isAnalyzing, onFlyToNote, onEditNote, onDeleteNote, onNavigateToNote, onAnalyzeNote, onUpdateStatus,
  noteSearchQuery, setNoteSearchQuery
}) => {
  const [sortMode, setSortMode] = useState<'date' | 'name'>('date');

  // Filter Notes
  const filteredNotes = notes.filter(note => 
    note.locationName.toLowerCase().includes(noteSearchQuery.toLowerCase()) || 
    note.userNote.toLowerCase().includes(noteSearchQuery.toLowerCase())
  );

  // Sort Notes
  const sortedNotes = [...filteredNotes].sort((a, b) => {
      if (sortMode === 'name') {
          return a.locationName.localeCompare(b.locationName);
      }
      return b.createdAt - a.createdAt; // Date Descending
  });

  const getVisibilityStyles = (visibility?: string) => {
      if (visibility === 'public') {
          return {
              container: 'bg-green-900/10 border-green-500/30 hover:bg-green-900/20',
              border: 'bg-green-500',
              icon: 'text-green-400'
          };
      }
      return {
          container: 'bg-red-900/10 border-red-500/30 hover:bg-red-900/20',
          border: 'bg-red-500',
          icon: 'text-red-400'
      };
  };

  return (
    <div className="mt-2">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-2 flex items-center justify-between">
            <span>المواقع المسجلة ({filteredNotes.length})</span>
            <MapIcon size={12} />
        </h3>

        {/* Search & Sort Controls */}
        <div className="px-1 mb-3 space-y-2">
            <div className="relative">
                <input 
                    type="text"
                    value={noteSearchQuery}
                    onChange={(e) => setNoteSearchQuery(e.target.value)}
                    placeholder="بحث سريع..."
                    className="w-full bg-slate-800/50 border border-slate-700/50 rounded-lg py-1.5 pr-8 pl-2 text-xs text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none transition-all text-right"
                />
                <Search className="absolute right-2.5 top-1.5 text-slate-500" size={12} />
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => setSortMode('date')}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] border transition-colors ${sortMode === 'date' ? 'bg-slate-700 text-white border-slate-600' : 'text-slate-500 border-transparent hover:bg-slate-800'}`}
                >
                    <Calendar size={10} /> الأحدث
                </button>
                <button 
                    onClick={() => setSortMode('name')}
                    className={`flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] border transition-colors ${sortMode === 'name' ? 'bg-slate-700 text-white border-slate-600' : 'text-slate-500 border-transparent hover:bg-slate-800'}`}
                >
                    <SortAsc size={10} /> الاسم
                </button>
            </div>
        </div>
        
        {sortedNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-slate-600 opacity-60">
                <BookOpen size={32} strokeWidth={1.5} />
                <p className="text-xs mt-2">لا توجد سجلات</p>
            </div>
        ) : (
            <div className="space-y-2 pb-20">
                {sortedNotes.map(note => {
                    const styles = getVisibilityStyles(note.visibility);
                    const isSelected = selectedNote?.id === note.id;

                    return (
                        <div 
                            key={note.id}
                            onClick={() => onFlyToNote(note)}
                            className={`relative p-3 rounded-xl border transition-all cursor-pointer group 
                                ${isSelected ? 'bg-blue-900/20 border-blue-500/50' : styles.container}`}
                        >
                            {/* Visibility Strip */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${styles.border}`}></div>
                            
                            <div className="pl-3">
                                {/* Header */}
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex items-center gap-2">
                                        {note.visibility === 'public' ? (
                                            <Globe size={14} className={styles.icon} />
                                        ) : (
                                            <Lock size={14} className={styles.icon} />
                                        )}
                                        <h4 className={`text-sm font-bold ${isSelected ? 'text-blue-400' : 'text-slate-200'}`}>
                                            {note.locationName}
                                        </h4>
                                    </div>
                                    
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {canCreate && (
                                            <button onClick={(e) => onEditNote(note, e)} className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-white"><Edit3 size={12} /></button>
                                        )}
                                        <button onClick={(e) => onDeleteNote(note.id, e)} className="p-1 hover:bg-red-900/30 rounded text-slate-400 hover:text-red-400"><Trash2 size={12} /></button>
                                    </div>
                                </div>
                                
                                <p className="text-xs text-slate-400 line-clamp-2 mb-2">{note.userNote}</p>
                                
                                {/* Action Buttons */}
                                <div className="flex items-center gap-2 mt-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onNavigateToNote(note); }}
                                            className="flex-1 bg-slate-900/40 hover:bg-blue-600/20 hover:text-blue-400 text-slate-400 text-[10px] py-1.5 rounded flex items-center justify-center gap-1 transition-colors border border-slate-700/30"
                                        >
                                            <Navigation2 size={10} /> ذهاب
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onAnalyzeNote(note); }}
                                            disabled={isAnalyzing}
                                            className="flex-1 bg-slate-900/40 hover:bg-purple-600/20 hover:text-purple-400 text-slate-400 text-[10px] py-1.5 rounded flex items-center justify-center gap-1 transition-colors border border-slate-700/30"
                                        >
                                            {isAnalyzing ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />} 
                                            تحليل
                                        </button>
                                </div>
                                
                                {/* Status Toggles with Labels */}
                                <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-700/30">
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onUpdateStatus(note.id, 'caught'); }}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded text-[10px] font-bold transition-all border 
                                                ${note.status === 'caught' 
                                                    ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                                    : 'bg-slate-900/30 text-slate-500 border-transparent hover:text-green-400'}`}
                                        >
                                            <CheckCircle2 size={12} />
                                            تم الإنجاز
                                        </button>
                                        
                                        <button
                                            onClick={(e) => { e.stopPropagation(); onUpdateStatus(note.id, 'not_caught'); }}
                                            className={`flex-1 flex items-center justify-center gap-1.5 py-1 rounded text-[10px] font-bold transition-all border 
                                                ${note.status === 'not_caught' 
                                                    ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                                                    : 'bg-slate-900/30 text-slate-500 border-transparent hover:text-red-400'}`}
                                        >
                                            <XSquare size={12} />
                                            قيد العمل
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="mt-1 text-right">
                                    <span className="text-[9px] text-slate-600 font-mono">
                                        {new Date(note.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
};
