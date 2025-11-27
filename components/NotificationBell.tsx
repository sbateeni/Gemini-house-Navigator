
import React, { useState } from 'react';
import { Bell, MapPin, CheckCircle2 } from 'lucide-react';
import { Assignment } from '../types';

interface NotificationBellProps {
  assignments: Assignment[];
  onAccept: (assignment: Assignment) => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ assignments, onAccept }) => {
  const [isOpen, setIsOpen] = useState(false);
  const pendingCount = assignments.filter(a => a.status === 'pending').length;

  if (assignments.length === 0) return null;

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-12 h-12 rounded-full flex items-center justify-center shadow-xl border transition-all active:scale-95
          ${pendingCount > 0 ? 'bg-slate-900 border-red-500/50' : 'bg-slate-900 border-slate-700 hover:bg-slate-800'}
        `}
        title="الإشعارات والمهام"
      >
        <Bell className={pendingCount > 0 ? "text-red-500 animate-pulse" : "text-slate-400"} size={24} />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-sm">
            {pendingCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-0 left-14 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-left-5 z-[1000]">
           <div className="px-3 py-2 text-xs font-bold uppercase text-slate-500 tracking-wider border-b border-slate-800 mb-2 text-right">
             مركز المهام
           </div>
           <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
             {assignments.map(assign => (
               <div key={assign.id} className={`p-3 rounded-xl border text-right ${assign.status === 'pending' ? 'bg-purple-900/20 border-purple-900/50' : 'bg-slate-800 border-slate-700'}`}>
                 <div className="flex flex-row-reverse items-start gap-3">
                    <div className="mt-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800 shrink-0">
                      <MapPin size={16} className="text-purple-400" />
                    </div>
                    <div className="flex-1">
                       <h4 className="text-sm font-bold text-white leading-tight mb-1">{assign.locationName}</h4>
                       {assign.instructions && (
                         <p className="text-xs text-slate-400 italic mb-2">"{assign.instructions}"</p>
                       )}
                       <div className="text-[10px] text-slate-500 mb-2 font-mono">
                         {new Date(assign.createdAt).toLocaleTimeString('ar-EG')}
                       </div>
                       
                       {assign.status === 'pending' ? (
                         <button 
                           onClick={() => { onAccept(assign); setIsOpen(false); }}
                           className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
                         >
                           <CheckCircle2 size={14} /> قبول وتوجه
                         </button>
                       ) : (
                         <div className="text-xs text-green-400 font-bold flex items-center justify-end gap-1">
                            تم القبول <CheckCircle2 size={12} />
                         </div>
                       )}
                    </div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      )}
    </div>
  );
};
