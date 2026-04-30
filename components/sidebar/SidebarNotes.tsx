
import React, { useState } from 'react';
import { MapIcon, BookOpen, Edit3, Trash2, Navigation2, Search, SortAsc, Calendar, Globe, Lock, ChevronDown, ChevronUp } from 'lucide-react';
import { MapNote, WantedStatus } from '../../types';
import { normalizeWantedStatus, wantedStatusBadgeClass, wantedStatusLabel } from '../../utils/status';
import { getNoteDisplayTitle } from '../../utils/noteDisplay';

interface SidebarNotesProps {
  notes: MapNote[];
  canCreate: boolean;
  onFlyToNote: (n: MapNote) => void;
  onEditNote: (n: MapNote, e: React.MouseEvent) => void;
  onDeleteNote: (id: string, e: React.MouseEvent) => void;
  onNavigateToNote: (n: MapNote) => void;
  onUpdateStatus: (id: string, s: WantedStatus) => void;
  noteSearchQuery: string; 
  setNoteSearchQuery: (q: string) => void; 
}

export const SidebarNotes: React.FC<SidebarNotesProps> = ({
  notes, canCreate, onFlyToNote, onEditNote, onDeleteNote, onNavigateToNote, onUpdateStatus,
  noteSearchQuery, setNoteSearchQuery
}) => {
  const [sortMode, setSortMode] = useState<'date' | 'name'>('date');
  const [statusFilter, setStatusFilter] = useState<'all' | WantedStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter Notes
  const filteredNotes = notes.filter(note => {
    const title = getNoteDisplayTitle(note).toLowerCase();
    const matchesText =
      title.includes(noteSearchQuery.toLowerCase()) ||
      note.userNote.toLowerCase().includes(noteSearchQuery.toLowerCase());
    const isPublicPlace = note.visibility === 'public';
    const matchesStatus =
      statusFilter === 'all'
        ? true
        : !isPublicPlace && normalizeWantedStatus(note.status) === statusFilter;
    return matchesText && matchesStatus;
  });

  // Sort Notes
  const sortedNotes = [...filteredNotes].sort((a, b) => {
      if (sortMode === 'name') {
          return getNoteDisplayTitle(a).localeCompare(getNoteDisplayTitle(b));
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
            <span>البلاغات المسجلة ({filteredNotes.length})</span>
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
            <div className="flex flex-wrap gap-1.5">
                {(['all', 'new', 'tracking', 'in_campaign', 'closed'] as const).map((status) => {
                    const isActive = statusFilter === status;
                    const label = status === 'all' ? 'الكل' : wantedStatusLabel[status];
                    return (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
                                isActive
                                    ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                    : 'bg-slate-800/70 border-slate-700 text-slate-400 hover:text-slate-200'
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
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
                    const currentStatus = normalizeWantedStatus(note.status);

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
                                    <div className="flex flex-col items-start gap-1">
                                        <span className={`text-sm font-bold ${styles.text}`}>
                                            {getNoteDisplayTitle(note)}
                                        </span>
                                        {!isPublic && (
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${wantedStatusBadgeClass[currentStatus]}`}>
                                                {wantedStatusLabel[currentStatus]}
                                            </span>
                                        )}
                                    </div>
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
                                            className="w-full bg-slate-800 hover:bg-blue-600/20 hover:text-blue-400 text-slate-300 text-[10px] py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-700"
                                        >
                                            <Navigation2 size={12} /> ذهاب
                                        </button>
                                    </div>

                                    {/* Status Toggles (PRIVATE ONLY) */}
                                    {!isPublic && (
                                        <div className="grid grid-cols-2 gap-2 mb-3">
                                            {(['new', 'tracking', 'in_campaign', 'closed'] as WantedStatus[]).map((status) => {
                                                const isActive = normalizeWantedStatus(note.status) === status;
                                                return (
                                                    <button
                                                        key={status}
                                                        onClick={(e) => { e.stopPropagation(); onUpdateStatus(note.id, status); }}
                                                        className={`py-1.5 rounded-lg text-[10px] font-bold transition-all border ${
                                                            isActive
                                                                ? 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                                                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-blue-300'
                                                        }`}
                                                    >
                                                        {wantedStatusLabel[status]}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {!isPublic && (
                                        <div className="text-[10px] text-slate-500 mb-2">
                                            الحالة الحالية: {wantedStatusLabel[currentStatus]}
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
