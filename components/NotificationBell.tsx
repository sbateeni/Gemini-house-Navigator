
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

  // Render even if empty to show the bell is there, or hide if preferred. 
  // User requested showing the bell with count.
  
  return (
    <div className="absolute top-52 left-4 z-[400]">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-12 h-12 backdrop-blur-xl border rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95
          ${pendingCount > 0 
            ? 'bg-red-600/90 border-red-500 text-white animate-pulse' 
            : 'bg-slate-900/90 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
      >
        <Bell size={24} className={pendingCount > 0 ? 'fill-current' : ''} />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-white text-red-600 text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-red-600 shadow-sm">
            {pendingCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-0 left-14 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-2 animate-in fade-in slide-in-from-left-5" dir="rtl">
           <div className="px-3 py-2 text-xs font-bold uppercase text-slate-500 tracking-wider border-b border-slate-800 mb-2 flex justify-between items-center">
             <span>مركز المهام</span>
             <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px]">{assignments.length}</span>
           </div>
           
           <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
             {assignments.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-xs">لا توجد مهام نشطة</div>
             ) : (
               assignments.map(assign => (
                 <div key={assign.id} className={`p-3 rounded-xl border transition-colors ${assign.status === 'pending' ? 'bg-purple-900/20 border-purple-900/50 hover:bg-purple-900/30' : 'bg-slate-800 border-slate-700 opacity-75'}`}>
                   <div className="flex items-start gap-3">
                      <div className="mt-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                        <MapPin size={16} className={assign.status === 'pending' ? "text-purple-400" : "text-green-500"} />
                      </div>
                      <div className="flex-1 text-right">
                         <h4 className="text-sm font-bold text-white leading-tight mb-1">{assign.locationName}</h4>
                         {assign.instructions && (
                           <p className="text-xs text-slate-400 italic mb-2 bg-slate-950/50 p-1.5 rounded">"{assign.instructions}"</p>
                         )}
                         <div className="text-[10px] text-slate-500 mb-2 font-mono">
                           {new Date(assign.createdAt).toLocaleTimeString('ar-EG')}
                         </div>
                         
                         {assign.status === 'pending' ? (
                           <button 
                             onClick={() => { onAccept(assign); setIsOpen(false); }}
                             className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-purple-900/20"
                           >
                             <CheckCircle2 size={14} /> قبول وتوجه
                           </button>
                         ) : (
                           <div className="text-xs text-green-400 font-bold flex items-center gap-1 bg-green-900/20 px-2 py-1 rounded w-fit">
                              <CheckCircle2 size={12} /> تم القبول
                           </div>
                         )}
                      </div>
                   </div>
                 </div>
               ))
             )}
           </div>
        </div>
      )}
    </div>
  );
};
