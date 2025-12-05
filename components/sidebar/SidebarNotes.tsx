
import React, { useState } from 'react';
import { MapIcon, BookOpen, Edit3, Trash2, Navigation2, Loader2, Sparkles, CheckSquare, XSquare, Search, SortAsc, Calendar, Globe, Lock, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const toggleExpand = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setExpandedId(prev => prev === id ? null : id);
      // Also fly to note when expanding
      const note = notes.find(n => n.id === id);
      if (note && expandedId !== id) {
          onFlyToNote(note);
      }
  };

  const getStyles = (visibility?: string) => {
      if (visibility === 'public') {
          return {
              wrapper: 'border-green-900/40 bg-green-900/5 hover:bg-green-900/10',
              borderLeft: 'bg-green-500',
              text: 'text-green-100',
              icon: 'text-green-500',
              iconBg: 'bg-green-900/20'
          };
      }
      return {
          wrapper: 'border-red-900/40 bg-red-900/5 hover:bg-red-900/10',
          borderLeft: 'bg-red-500',
          text: 'text-red-100',
          icon: 'text-red-500',
          iconBg: 'bg-red-900/20'
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
                    placeholder="فلترة القائمة..."
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
                    const styles = getStyles(note.visibility);
                    const isExpanded = expandedId === note.id;
                    const isPublic = note.visibility === 'public';

                    return (
                        <div 
                            key={note.id}
                            className={`relative rounded-lg border transition-all overflow-hidden ${styles.wrapper}`}
                        >
                            {/* Colored Strip */}
                            <div className={`absolute right-0 top-0 bottom-0 w-1 ${styles.borderLeft}`}></div>
                            
                            {/* Compact Header (Always Visible) */}
                            <div 
                                onClick={(e) => toggleExpand(note.id, e)}
                                className="p-3 pr-4 flex items-center justify-between cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`p-1.5 rounded-md ${styles.iconBg}`}>
                                        {isPublic ? <Globe size={14} className={styles.icon} /> : <Lock size={14} className={styles.icon} />}
                                    </div>
                                    <span className={`text-sm font-bold ${styles.text}`}>
                                        {note.locationName}
                                    </span>
                                </div>
                                
                                {isExpanded ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                                <div className="px-3 pb-3 pr-4 animate-in slide-in-from-top-2 fade-in duration-200 bg-slate-900/30">
                                    {/* Note Text */}
                                    <div className="mb-3 pt-2 border-t border-slate-700/30">
                                        <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                                            {note.userNote || "لا توجد ملاحظات إضافية."}
                                        </p>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-2 mb-3">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onNavigateToNote(note); }}
                                            className="flex-1 bg-slate-800 hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 text-[10px] py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                                        >
                                            <Navigation2 size={12} /> ذهاب
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onAnalyzeNote(note); }}
                                            disabled={isAnalyzing}
                                            className="flex-1 bg-slate-800 hover:bg-purple-600/20 hover:text-purple-400 text-slate-300 text-[10px] py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                                        >
                                            {isAnalyzing ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} 
                                            تحليل
                                        </button>
                                    </div>

                                    {/* Status Toggles (PRIVATE ONLY) */}
                                    {!isPublic && (
                                        <div className="flex gap-2 mb-3">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onUpdateStatus(note.id, 'caught'); }}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border 
                                                    ${note.status === 'caught' 
                                                        ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                                        : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-green-400'}`}
                                            >
                                                <CheckSquare size={14} />
                                                تم الإنجاز
                                            </button>
                                            
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onUpdateStatus(note.id, 'not_caught'); }}
                                                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[10px] font-bold transition-all border 
                                                    ${note.status === 'not_caught' 
                                                        ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                                                        : 'bg-slate-800 text-slate-500 border-slate-700 hover:text-red-400'}`}
                                            >
                                                <XSquare size={14} />
                                                قيد العمل
                                            </button>
                                        </div>
                                    )}

                                    {/* Footer: Date & Admin Tools */}
                                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/30 mt-2">
                                        <span className="text-[10px] text-slate-600 font-mono">
                                            {new Date(note.createdAt).toLocaleDateString('ar-EG')}
                                        </span>
                                        
                                        <div className="flex items-center gap-1">
                                            {canCreate && (
                                                <button 
                                                    onClick={(e) => onEditNote(note, e)} 
                                                    className="p-1.5 hover:bg-slate-700 rounded text-slate-500 hover:text-white transition-colors"
                                                    title="تعديل"
                                                >
                                                    <Edit3 size={12} />
                                                </button>
                                            )}
                                            <button 
                                                onClick={(e) => onDeleteNote(note.id, e)} 
                                                className="p-1.5 hover:bg-red-900/30 rounded text-slate-500 hover:text-red-400 transition-colors"
                                                title="حذف"
                                            >
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        )}
    </div>
  );
};
