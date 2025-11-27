


import React from 'react';
import { MapIcon, BookOpen, MapPin, Edit3, Trash2, Navigation2, Loader2, Sparkles, CheckCircle2, XSquare } from 'lucide-react';
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
}

export const SidebarNotes: React.FC<SidebarNotesProps> = ({
  notes, selectedNote, canCreate, isAnalyzing, onFlyToNote, onEditNote, onDeleteNote, onNavigateToNote, onAnalyzeNote, onUpdateStatus
}) => {
  const getStatusStyle = (status?: string) => {
    if (status === 'caught') return 'border-green-500/50 bg-green-900/10';
    if (status === 'not_caught') return 'border-red-500/50 bg-red-900/10';
    return '';
  };

  return (
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
  );
};
