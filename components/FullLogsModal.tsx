
import React, { useState, useEffect } from 'react';
import { X, Activity, AlertTriangle, Radio, Info, MapPin } from 'lucide-react';
import { db } from '../services/db';
import { LogEntry } from '../types';

interface FullLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FullLogsModal: React.FC<FullLogsModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      db.getRecentLogs().then((data) => {
        setLogs(data);
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const formatTime = (ts: number) => new Date(ts).toLocaleString('ar-EG');

  return (
    <div className="fixed inset-0 z-[1500] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
        
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="bg-green-900/20 p-2 rounded-lg border border-green-900/50">
                <Activity className="text-green-500" size={20} />
            </div>
            <div>
                <h2 className="text-lg font-bold text-white">سجل العمليات الكامل</h2>
                <p className="text-xs text-slate-400">جميع الأحداث والتنبيهات المسجلة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-0 font-mono text-sm scrollbar-thin scrollbar-thumb-slate-700 bg-slate-950">
           {loading ? (
             <div className="p-10 text-center text-slate-500">جاري تحميل السجلات...</div>
           ) : logs.length === 0 ? (
             <div className="p-10 text-center text-slate-500">لا توجد سجلات.</div>
           ) : (
             <div className="divide-y divide-slate-800/50">
               {logs.map(log => (
                 <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors flex items-start gap-4">
                    <div className="shrink-0 mt-1">
                       {log.type === 'alert' && <AlertTriangle className="text-red-500" size={18} />}
                       {log.type === 'dispatch' && <Radio className="text-purple-500" size={18} />}
                       {log.type === 'status' && <Info className="text-blue-500" size={18} />}
                       {log.type === 'info' && <Info className="text-slate-500" size={18} />}
                    </div>
                    <div className="flex-1">
                       <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-1">
                          <span className={`font-bold text-base leading-snug ${log.type === 'alert' ? 'text-red-400' : 'text-slate-200'}`}>
                            {log.message}
                          </span>
                          <span className="text-xs text-slate-500 whitespace-nowrap font-mono dir-ltr text-right">
                            {formatTime(log.timestamp)}
                          </span>
                       </div>
                       
                       {(log.governorate || log.center) && (
                         <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500 bg-slate-900/50 w-fit px-2 py-1 rounded border border-slate-800">
                            <MapPin size={10} />
                            <span>{log.governorate || '---'}</span>
                            <span className="text-slate-700">/</span>
                            <span>{log.center || '---'}</span>
                         </div>
                       )}
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
