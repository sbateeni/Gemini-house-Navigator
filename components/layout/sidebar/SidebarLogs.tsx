import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Radio, Info, Maximize2 } from 'lucide-react';
import { supabase } from '../../../services/supabase';
import { db } from '../../../services/db';
import { LogEntry } from '../../../types';

interface SidebarLogsProps {
  onExpandLogs: () => void;
  onCountChange?: (count: number) => void;
}

const formatTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('ar-EG', { hour12: false, hour: '2-digit', minute: '2-digit' });

const getIcon = (type: string) => {
  switch (type) {
    case 'alert': return <AlertTriangle size={14} className="text-red-500 shrink-0" />;
    case 'dispatch': return <Radio size={14} className="text-purple-500 shrink-0" />;
    default: return <Info size={14} className="text-slate-500 shrink-0" />;
  }
};

export const SidebarLogs: React.FC<SidebarLogsProps> = ({ onExpandLogs, onCountChange }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    db.getRecentLogs().then((data) => { setLogs(data); onCountChange?.(data.length); });
    const channel = supabase
      .channel('sidebar-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'logs' }, (payload: any) => {
        setLogs((prev) => {
          const next = [{ id: payload.new.id, message: payload.new.message, type: payload.new.type, timestamp: payload.new.timestamp, userId: payload.new.user_id }, ...prev].slice(0, 50);
          onCountChange?.(next.length);
          return next;
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="space-y-1">
      <h3 className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 flex items-center justify-between">
        <span>سجل العمليات</span>
        <Activity size={12} />
      </h3>
      {logs.length === 0 ? (
        <p className="text-xs text-slate-600 text-center py-4">لا توجد أحداث مسجلة</p>
      ) : (
        <div className="space-y-1">
          {logs.slice(0, 30).map((log) => (
            <div
              key={log.id}
              className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-xs ${
                log.type === 'alert'
                  ? 'bg-red-900/10 border-red-900/20 text-red-300'
                  : 'bg-slate-800/30 border-slate-800/50 text-slate-400'
              }`}
            >
              {getIcon(log.type)}
              <div className="flex-1 min-w-0">
                <p className="font-bold truncate">{log.message}</p>
                <span className="text-[9px] text-slate-600 font-mono">{formatTime(log.timestamp)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        onClick={onExpandLogs}
        className="w-full flex items-center justify-center gap-1 py-2 text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:bg-slate-800/30 rounded-lg transition-colors mt-2"
      >
        <Maximize2 size={12} />
        عرض السجل الكامل
      </button>
    </div>
  );
};
