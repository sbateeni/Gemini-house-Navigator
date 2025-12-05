
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

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('ar-EG', { hour12: false });

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[2000] bg-slate-950/95 border-t border-slate-800 h-16 flex items-center px-4 font-mono text-xs overflow-hidden cursor-pointer hover:bg-slate-900 transition-colors group shadow-[0_-4px_20px_rgba(0,0,0,0.5)]" 
      dir="rtl"
      onClick={onExpand}
      title="اضغط لعرض السجل الكامل"
    >
      <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700 ml-4 flex items-center gap-2 shrink-0 shadow-lg">
         <Activity size={14} className="text-green-500 animate-pulse" />
         <span className="text-green-500 font-bold tracking-wider">سجل العمليات</span>
      </div>
      
      <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-8 px-4" ref={scrollRef}>
         {logs.map(log => (
            <div key={log.id} className={`flex items-center gap-2 animate-in fade-in slide-in-from-left-4 shrink-0 ${log.type === 'alert' ? 'text-red-400' : 'text-slate-400'}`}>
               <span className="text-slate-600 font-mono">[{formatTime(log.timestamp)}]</span>
               {log.type === 'alert' && <AlertTriangle size={12} />}
               {log.type === 'dispatch' && <Radio size={12} className="text-purple-400" />}
               <span className={`font-bold ${log.type === 'alert' ? 'text-red-500 uppercase' : 'text-slate-300'}`}>
                 {log.message}
               </span>
            </div>
         ))}
         {logs.length === 0 && <span className="text-slate-600 italic">النظام جاهز. بانتظار الأحداث...</span>}
      </div>

      <div className="mr-4 text-slate-600 group-hover:text-blue-400 transition-colors p-2 bg-slate-900/50 rounded-full">
          <Maximize2 size={16} />
      </div>
    </div>
  );
};
