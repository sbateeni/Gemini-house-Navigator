
import React from 'react';
import { Activity, Users, ShieldAlert, Target, Zap, BarChart3, TrendingUp } from 'lucide-react';
import { MapUser, MapNote } from '../types';

interface StrategicDashboardProps {
  onlineUsers: MapUser[];
  notes: MapNote[];
  isOpen: boolean;
}

export const StrategicDashboard: React.FC<StrategicDashboardProps> = ({ onlineUsers, notes, isOpen }) => {
  if (!isOpen) return null;

  const activeSOS = onlineUsers.filter(u => u.isSOS).length;
  const busyUnits = onlineUsers.filter(u => u.status === 'busy' || u.status === 'pursuit').length;
  const completedTasks = notes.filter(n => n.status === 'caught').length;

  return (
    <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pointer-events-none" dir="rtl">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Unit Status Card */}
        <div className="glass-panel p-4 rounded-2xl border-t-2 border-blue-500 shadow-lg pointer-events-auto animate-in slide-in-from-top-4 duration-300">
           <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">إجمالي القوة نشطة</span>
              <Users size={14} className="text-blue-400" />
           </div>
           <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-white">{onlineUsers.length}</span>
              <span className="text-[10px] text-green-400 mb-1 flex items-center gap-1">
                 <Zap size={8} /> متصل الآن
              </span>
           </div>
           <div className="mt-3 h-1 w-full bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-1000" style={{ width: `${(onlineUsers.length / 50) * 100}%` }}></div>
           </div>
        </div>

        {/* SOS Monitor Card */}
        <div className={`glass-panel p-4 rounded-2xl border-t-2 shadow-lg pointer-events-auto animate-in slide-in-from-top-4 delay-75 duration-300 ${activeSOS > 0 ? 'border-red-500 animate-pulse' : 'border-slate-700'}`}>
           <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">تنبيهات الاستغاثة</span>
              <ShieldAlert size={14} className={activeSOS > 0 ? 'text-red-500' : 'text-slate-500'} />
           </div>
           <div className="flex items-end gap-2">
              <span className={`text-3xl font-black ${activeSOS > 0 ? 'text-red-500' : 'text-white'}`}>{activeSOS}</span>
              <span className="text-[10px] text-slate-500 mb-1">بلاغات معلقة</span>
           </div>
        </div>

        {/* Operational Efficiency */}
        <div className="glass-panel p-4 rounded-2xl border-t-2 border-emerald-500 shadow-lg pointer-events-auto animate-in slide-in-from-top-4 delay-150 duration-300">
           <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">كفاءة العمليات</span>
              <Target size={14} className="text-emerald-400" />
           </div>
           <div className="flex items-end gap-2">
              <span className="text-3xl font-black text-white">%{Math.round((completedTasks / (notes.length || 1)) * 100)}</span>
              <span className="text-[10px] text-emerald-400 mb-1">إنجاز الأهداف</span>
           </div>
        </div>

        {/* Live Traffic/Activity Analytics */}
        <div className="glass-panel p-4 rounded-2xl border-t-2 border-purple-500 shadow-lg pointer-events-auto animate-in slide-in-from-top-4 delay-200 duration-300">
           <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ضغط العمليات</span>
              <Activity size={14} className="text-purple-400" />
           </div>
           <div className="flex items-center gap-3">
              <div className="flex-1">
                 <div className="flex justify-between text-[9px] text-slate-500 mb-1">
                    <span>وحدات مشغولة</span>
                    <span>{busyUnits}</span>
                 </div>
                 <div className="h-1 w-full bg-slate-800 rounded-full">
                    <div className="h-full bg-purple-500" style={{ width: `${(busyUnits / (onlineUsers.length || 1)) * 100}%` }}></div>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
};
