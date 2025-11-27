
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

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-12 h-12 bg-slate-900 text-white border border-slate-700 rounded-full flex items-center justify-center shadow-xl hover:bg-slate-800 transition-colors"
        title="الإشعارات والمهام"
      >
        <Bell className={pendingCount > 0 ? "text-white animate-swing" : "text-slate-400"} size={22} />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-slate-900 shadow-sm animate-pulse">
            {pendingCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-0 left-14 w-72 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl p-0 animate-in fade-in slide-in-from-left-2 overflow-hidden z-[500]">
           <div className="px-4 py-3 text-xs font-bold uppercase text-slate-400 tracking-wider border-b border-slate-800 bg-slate-950/50">
             مركز المهام والتوجيه
           </div>
           
           <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
             {assignments.length === 0 ? (
                 <div className="p-6 text-center text-slate-500 text-xs">لا توجد مهام نشطة حالياً.</div>
             ) : (
                 <div className="p-2 space-y-2">
                    {assignments.map(assign => (
                    <div key={assign.id} className={`p-3 rounded-xl border transition-colors ${assign.status === 'pending' ? 'bg-purple-900/20 border-purple-900/50 hover:bg-purple-900/30' : 'bg-slate-800/50 border-slate-700'}`}>
                        <div className="flex items-start gap-3">
                            <div className="mt-1 bg-slate-950 p-1.5 rounded-lg border border-slate-800">
                            <MapPin size={16} className="text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-bold text-white leading-tight mb-1 truncate text-right">{assign.locationName}</h4>
                            {assign.instructions && (
                                <p className="text-xs text-slate-300 italic mb-2 text-right bg-black/20 p-1.5 rounded">"{assign.instructions}"</p>
                            )}
                            
                            {assign.status === 'pending' ? (
                                <button 
                                onClick={() => { onAccept(assign); setIsOpen(false); }}
                                className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-purple-900/20"
                                >
                                <CheckCircle2 size={14} /> قبول وتوجه
                                </button>
                            ) : (
                                <div className="text-xs text-green-400 font-bold flex items-center justify-end gap-1 bg-green-900/10 py-1 px-2 rounded w-fit ml-auto">
                                    <CheckCircle2 size={12} /> تم القبول
                                </div>
                            )}
                            </div>
                        </div>
                    </div>
                    ))}
                 </div>
             )}
           </div>
        </div>
      )}
    </div>
  );
};
