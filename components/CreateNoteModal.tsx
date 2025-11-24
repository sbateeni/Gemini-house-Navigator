import React from 'react';
import { MapPin, X, Plus } from 'lucide-react';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tempCoords: { lat: number; lng: number } | null;
  userNoteInput: string;
  setUserNoteInput: (val: string) => void;
  onSave: () => void;
  isAnalyzing: boolean; // Kept in interface to avoid breaking parent usage, but unused for loading now
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  isOpen,
  onClose,
  tempCoords,
  userNoteInput,
  setUserNoteInput,
  onSave,
  isAnalyzing
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[1100] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4">
      <div className="bg-slate-900 border-t md:border border-slate-700 p-6 rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md transform transition-all animate-in slide-in-from-bottom-10 md:zoom-in-95">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center text-blue-500">
              <MapPin size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">New Entry</h2>
              <p className="text-xs text-slate-400 font-mono">
                {tempCoords?.lat.toFixed(4)}, {tempCoords?.lng.toFixed(4)}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-white">
            <X size={24} />
          </button>
        </div>
        
        <textarea
          autoFocus
          value={userNoteInput}
          onChange={(e) => setUserNoteInput(e.target.value)}
          placeholder="What did you discover?"
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-base text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-h-[140px] resize-none placeholder-slate-600 mb-6"
        />
        
        <button 
          onClick={onSave}
          disabled={!userNoteInput.trim()}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl text-base font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 mb-2"
        >
          <Plus size={20} />
          Save Entry
        </button>
      </div>
    </div>
  );
};