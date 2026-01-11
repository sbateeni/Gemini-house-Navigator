
import React from 'react';
import { LayoutDashboard, Settings, LogOut, Briefcase } from 'lucide-react';

interface SidebarFooterProps {
  isAdmin: boolean;
  onOpenDashboard: () => void;
  onOpenSettings: () => void;
  onOpenCampaigns: () => void;
  onLogout: () => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({ isAdmin, onOpenDashboard, onOpenSettings, onOpenCampaigns, onLogout }) => {
  return (
      <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-2">
           <div className="grid grid-cols-2 gap-2">
                {isAdmin && (
                    <button onClick={onOpenDashboard} className="flex items-center justify-center gap-1 bg-purple-900/20 hover:bg-purple-900/30 text-purple-400 border border-purple-900/50 py-2 rounded-lg text-xs font-bold transition-all">
                        <LayoutDashboard size={14} /> القيادة
                    </button>
                )}
                <button onClick={onOpenSettings} className={`flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 py-2 rounded-lg text-xs font-bold transition-all ${!isAdmin ? 'col-span-2' : ''}`}>
                    <Settings size={14} /> الإعدادات
                </button>
           </div>
           
           {isAdmin && (
               <button onClick={onOpenCampaigns} className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-yellow-500 border border-slate-700 py-2 rounded-lg text-xs font-bold transition-all">
                   <Briefcase size={16} /> مركز المهام الميدانية
               </button>
           )}

           <button onClick={onLogout} className="w-full flex items-center justify-center gap-1 text-red-400 hover:bg-red-900/10 py-2 rounded-lg text-xs font-bold transition-colors">
               <LogOut size={14} /> تسجيل الخروج
           </button>
      </div>
  );
};
