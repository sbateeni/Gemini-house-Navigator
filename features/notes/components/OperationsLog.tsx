import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../services/supabase';
import { db } from '../../../services/db';
import { LogEntry } from '../../../types';
import { Activity, AlertTriangle, Radio, Maximize2 } from 'lucide-react';

interface OperationsLogProps {
  onExpand?: () => void;
  onLocateUser?: (userId: string) => void;
}

export const OperationsLog: React.FC<OperationsLogProps> = ({ onExpand, onLocateUser }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [newLogIds, setNewLogIds] = useState<Set<string>>(new Set());
  const [hasAlert, setHasAlert] = useState(false);
  const [liveTime, setLiveTime] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const alertTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          // Mark as new for flash animation
          setNewLogIds(prev => new Set(prev).add(newLog.id));
          setTimeout(() => {
            setNewLogIds(prev => {
              const next = new Set(prev);
              next.delete(newLog.id);
              return next;
            });
          }, 2500);

          // Flash the bar red on alert
          if (newLog.type === 'alert') {
            setHasAlert(true);
            if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
            alertTimerRef.current = setTimeout(() => setHasAlert(false), 4000);
          }
        }
      )
      .subscribe();

    // Live clock
    const clockInterval = setInterval(() => {
      setLiveTime(new Date().toLocaleTimeString('ar-EG', { hour12: false }));
    }, 1000);
    setLiveTime(new Date().toLocaleTimeString('ar-EG', { hour12: false }));

    return () => { supabase.removeChannel(channel); clearInterval(clockInterval); };
  }, []);

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('ar-EG', { hour12: false, hour: '2-digit', minute: '2-digit' });

  return (
    <div 
      className={`absolute bottom-0 left-0 right-0 z-[1000] glass-panel border-t h-16 flex items-center px-6 font-mono text-xs overflow-hidden cursor-pointer transition-all group shadow-[0_-10px_40px_rgba(0,0,0,0.8)] ${
        hasAlert 
          ? 'bg-red-900/40 border-red-500/50 animate-pulse' 
          : 'hover:bg-slate-900/90 border-white/5'
      }`} 
      dir="rtl"
      onClick={onExpand}
    >
      <div className={`px-4 py-1.5 rounded-full border ml-6 flex items-center gap-2 shrink-0 transition-all duration-500 ${
          hasAlert
            ? 'bg-red-900/80 border-red-500/70 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
            : 'bg-slate-900/90 border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]'
        }`}>
         <Activity size={14} className={hasAlert ? 'text-red-400 animate-ping' : 'text-blue-400 animate-pulse'} />
         <span className={`font-black tracking-widest text-[10px] uppercase ${hasAlert ? 'text-red-400' : 'text-blue-400'}`}>سجل العمليات</span>
         <span className="text-[9px] font-mono text-slate-500 border-r border-slate-700 pr-2 mr-1">{liveTime}</span>
      </div>
      
       <div className="flex-1 overflow-x-auto whitespace-nowrap scrollbar-none flex items-center gap-10 px-4" ref={scrollRef}>
          {logs.map(log => (
             <div key={log.id} className={`flex items-center gap-3 shrink-0 transition-all duration-300 rounded-lg px-2 py-0.5 ${newLogIds.has(log.id) ? 'animate-flash' : ''} ${log.type === 'alert' ? 'text-red-400' : 'text-slate-400'}`}>
                <span className="text-slate-600 font-mono font-bold">[{formatTime(log.timestamp)}]</span>
                <div className="flex items-center gap-2">
                    {log.type === 'alert' && <AlertTriangle size={14} className="animate-bounce" />}
                    {log.type === 'dispatch' && <Radio size={14} className="text-purple-400" />}
                    {log.type === 'alert' && log.userId && onLocateUser ? (
                      <button onClick={(e) => { e.stopPropagation(); onLocateUser(log.userId!); }} className="text-[11px] font-bold text-red-500 hover:text-red-300 hover:underline cursor-pointer">
                        {log.message}
                      </button>
                    ) : (
                      <span className={`text-[11px] font-bold ${log.type === 'alert' ? 'text-red-500' : 'text-slate-200'}`}>
                        {log.message}
                      </span>
                    )}
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
