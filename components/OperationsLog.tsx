
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { db } from '../services/db';
import { LogEntry } from '../types';
import { Activity, AlertTriangle, Radio, Maximize2 } from 'lucide-react';

interface OperationsLogProps {
  onExpand?: () => void;
}

export const OperationsLog: React.FC<OperationsLogProps> = ({ onExpand }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    db.getRecentLogs().then(setLogs);

    const channel = supabase
      .channel('public-logs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'logs' },
        (payload: any) => {
          const newLog: LogEntry = {
             id: payload.new.id,
             message: payload.new.message,
             type: payload.new.type,
             timestamp: payload.new.timestamp,
             userId: payload.new.user_id,
             governorate: payload.new.governorate,
             center: payload.new.center
          };
          setLogs(prev => [newLog, ...prev].slice(0, 50)); 
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('ar-EG', { hour12: false, hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 z-[1000] glass-panel border-t border-white/5 h-16 flex items-center px-6 font-mono text-xs overflow-hidden cursor-pointer hover:bg-slate-900/90 transition-all group shadow-[0_-10px_40px_rgba(0,0,0,0.8)]" 
      dir="rtl"
      onClick={onExpand}
    >
      <div className="bg-slate-900/90 px-4 py-1.5 rounded-full border border-blue-500/30 ml-6 flex items-center gap-2 shrink-0 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
         <Activity size={14} className="text-blue-400 animate-pulse" />
         <span className="text-blue-400 font-black tracking-widest text-[10px] uppercase">سجل العمليات المباشر</span>
      </div>
      
      <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-10 px-4" ref={scrollRef}>
         {logs.map(log => (
            <div key={log.id} className={`flex items-center gap-3 animate-in fade-in slide-in-from-left-4 shrink-0 transition-opacity duration-300 ${log.type === 'alert' ? 'text-red-400' : 'text-slate-400'}`}>
               <span className="text-slate-600 font-mono font-bold">[{formatTime(log.timestamp)}]</span>
               <div className="flex items-center gap-2">
                   {log.type === 'alert' && <AlertTriangle size={14} className="animate-bounce" />}
                   {log.type === 'dispatch' && <Radio size={14} className="text-purple-400" />}
                   <span className={`text-[11px] font-bold ${log.type === 'alert' ? 'text-red-500' : 'text-slate-200'}`}>
                     {log.message}
                   </span>
               </div>
            </div>
         ))}
         {logs.length === 0 && <span className="text-slate-600 italic tracking-widest animate-pulse">جاري استلام البيانات من الأقمار الصناعية...</span>}
      </div>

      <div className="mr-6 text-slate-500 group-hover:text-blue-400 transition-all p-2 bg-slate-900/50 rounded-xl border border-white/5">
          <Maximize2 size={18} />
      </div>
    </div>
  );
};
