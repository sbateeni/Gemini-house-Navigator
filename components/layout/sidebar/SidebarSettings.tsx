import React from 'react';
import { LayoutDashboard, Settings, LogOut, Briefcase } from 'lucide-react';

interface SidebarSettingsProps {
  isAdmin: boolean;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
  onOpenCampaigns: () => void;
  onLogout: () => void;
}

export const SidebarSettings: React.FC<SidebarSettingsProps> = ({
  isAdmin, onOpenDashboard, onOpenSettings, onOpenCampaigns, onLogout,
}) => (
  <div className="p-2 space-y-2">
    <h3 className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-2">الإعدادات</h3>
    <div className="grid grid-cols-2 gap-2">
      {isAdmin && (
        <button onClick={onOpenDashboard} className="flex items-center justify-center gap-2 bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 border border-purple-900/50 py-3 rounded-xl text-xs font-bold transition-all">
          <LayoutDashboard size={16} /> القيادة
        </button>
      )}
      <button onClick={onOpenSettings} className={`flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 py-3 rounded-xl text-xs font-bold transition-all ${!isAdmin ? 'col-span-2' : ''}`}>
        <Settings size={16} /> الإعدادات
      </button>
    </div>
    {isAdmin && (
      <button onClick={onOpenCampaigns} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-yellow-500 border border-slate-700 py-3 rounded-xl text-xs font-bold transition-all">
        <Briefcase size={16} /> مركز المهام
      </button>
    )}
    <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 text-red-400 hover:bg-red-900/10 py-3 rounded-xl text-xs font-bold transition-all">
      <LogOut size={16} /> تسجيل الخروج
    </button>
  </div>
);
