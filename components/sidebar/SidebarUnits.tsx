
import React from 'react';
import { Users } from 'lucide-react';
import { MapUser, UserProfile } from '../../types';

interface SidebarUnitsProps {
  onlineUsers: MapUser[];
  allProfiles: UserProfile[];
}

export const SidebarUnits: React.FC<SidebarUnitsProps> = ({ onlineUsers, allProfiles }) => {
  const statusColors: any = {
    patrol: 'bg-green-500',
    busy: 'bg-yellow-500',
    pursuit: 'bg-red-500',
    offline: 'bg-slate-500'
  };

  const statusLabels: any = {
    patrol: 'دورية',
    busy: 'مشغول',
    pursuit: 'مطاردة',
    offline: 'غير متصل'
  };

  const onlineIds = new Set(onlineUsers.map(u => u.id));
  const sortedUsers = [...allProfiles].sort((a, b) => {
    const aOnline = onlineIds.has(a.id);
    const bOnline = onlineIds.has(b.id);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return 0;
  });

  return (
    <div className="mb-4 space-y-1">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 flex items-center justify-between">
            <span>حالة القوات ({onlineUsers.length} متصل)</span>
            <Users size={12} />
        </h3>
        {sortedUsers.slice(0, 10).map(u => {
            const isOnline = onlineIds.has(u.id);
            const onlineUser = onlineUsers.find(ou => ou.id === u.id);
            const status = onlineUser?.status || 'offline';
            
            return (
                <div key={u.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/50">
                        <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? statusColors[status] || 'bg-slate-500' : 'bg-slate-500'} ${isOnline ? 'animate-pulse' : ''}`}></div>
                        <div className="flex flex-col">
                            <span className={`text-xs font-bold ${isOnline ? 'text-slate-200' : 'text-slate-500'}`}>{u.username}</span>
                            {isOnline && <span className="text-[9px] text-slate-500">{statusLabels[status]}</span>}
                        </div>
                        </div>
                </div>
            );
        })}
    </div>
  );
};
