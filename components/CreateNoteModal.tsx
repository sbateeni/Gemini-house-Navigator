import React from 'react';
import { MapPin, X, Plus, Edit3 } from 'lucide-react';

interface CreateNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  tempCoords: { lat: number; lng: number } | null;
  userNoteInput: string;
  setUserNoteInput: (val: string) => void;
  onSave: () => void;
  isAnalyzing: boolean;
  mode?: 'create' | 'edit';
}

export const CreateNoteModal: React.FC<CreateNoteModalProps> = ({
  isOpen,
  onClose,
  tempCoords,
  userNoteInput,
  setUserNoteInput,
  onSave,
  isAnalyzing,
  mode = 'create'
}) => {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-[1100] bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4" dir="rtl">
      <div className="bg-slate-900 border-t md:border border-slate-700 p-6 rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-md transform transition-all animate-in slide-in-from-bottom-10 md:zoom-in-95">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${mode === 'edit' ? 'bg-yellow-600/20 text-yellow-500' : 'bg-blue-600/20 text-blue-500'}`}>
              {mode === 'edit' ? <Edit3 size={20} /> : <MapPin size={20} />}
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-white">{mode === 'edit' ? 'تعديل الموقع' : 'موقع جديد'}</h2>
              <p className="text-xs text-slate-400 font-mono" dir="ltr">
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
          placeholder="أدخل ملاحظاتك الاستخباراتية هنا..."
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-base text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all min-h-[140px] resize-none placeholder-slate-600 mb-6 text-right"
        />
        
        <button 
          onClick={onSave}
          disabled={!userNoteInput.trim()}
          className={`w-full text-white py-4 rounded-xl text-base font-bold shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 mb-2 disabled:opacity-50 disabled:cursor-not-allowed
            ${mode === 'edit' 
              ? 'bg-yellow-600 hover:bg-yellow-500 shadow-yellow-900/20' 
              : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'}`}
        >
          {mode === 'edit' ? <Edit3 size={20} /> : <Plus size={20} />}
          {mode === 'edit' ? 'تحديث البيانات' : 'حفظ الموقع'}
        </button>
      </div>
    </div>
  );
};