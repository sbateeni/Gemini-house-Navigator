
import React from 'react';
import { X, MapPin } from 'lucide-react';
import { MapNote } from '../types';

interface LocationPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  notes: MapNote[];
  onSelectLocation: (note: MapNote) => void;
  targetUserName?: string;
}

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({
  isOpen,
  onClose,
  notes,
  onSelectLocation,
  targetUserName
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[1300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col animate-in fade-in slide-in-from-bottom-5">
        
        <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-white">Select Destination</h2>
            <p className="text-xs text-purple-400">Dispatching: {targetUserName || 'User'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {notes.length === 0 ? (
                <div className="p-8 text-center text-slate-500">No saved locations found.</div>
            ) : (
                notes.map(note => (
                    <button
                        key={note.id}
                        onClick={() => onSelectLocation(note)}
                        className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl flex items-center gap-4 transition-all group text-left"
                    >
                        <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <MapPin size={18} />
                        </div>
                        <div>
                            <div className="font-bold text-slate-200 group-hover:text-white">{note.locationName}</div>
                            <div className="text-xs text-slate-500 line-clamp-1">{note.userNote}</div>
                        </div>
                    </button>
                ))
            )}
        </div>
      </div>
    </div>
  );
};
