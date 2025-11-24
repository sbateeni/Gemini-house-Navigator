
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabase';
import { db } from '../services/db';
import { LogEntry } from '../types';
import { Activity, AlertTriangle, Radio } from 'lucide-react';

export const OperationsLog: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial fetch
    db.getRecentLogs().then(setLogs);

    // Realtime subscription
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
             userId: payload.new.user_id
          };
          setLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Format time HH:MM:SS
  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour12: false });

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[1000] bg-slate-950/95 border-t border-slate-800 h-16 flex items-center px-4 font-mono text-xs overflow-hidden">
      <div className="bg-slate-900/50 px-2 py-1 rounded border border-slate-700 mr-4 flex items-center gap-2 shrink-0">
         <Activity size={14} className="text-green-500 animate-pulse" />
         <span className="text-green-500 font-bold tracking-wider">OPS_LOG</span>
      </div>
      
      <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-6" ref={scrollRef}>
         {logs.map(log => (
            <div key={log.id} className={`flex items-center gap-2 animate-in fade-in slide-in-from-right-4 shrink-0 ${log.type === 'alert' ? 'text-red-400' : 'text-slate-400'}`}>
               <span className="text-slate-600">[{formatTime(log.timestamp)}]</span>
               {log.type === 'alert' && <AlertTriangle size={12} />}
               {log.type === 'dispatch' && <Radio size={12} className="text-purple-400" />}
               <span className={`font-bold ${log.type === 'alert' ? 'text-red-500 uppercase' : 'text-slate-300'}`}>
                 {log.message}
               </span>
            </div>
         ))}
         {logs.length === 0 && <span className="text-slate-600 italic">System initialized. Waiting for events...</span>}
      </div>
    </div>
  );
};
