
import React from 'react';
import { Users, Clock } from 'lucide-react';
import { MapUser, UserProfile } from '../../types';

interface SidebarUnitsProps {
  onlineUsers: MapUser[];
  allProfiles: UserProfile[];
  currentUserId?: string;
}

export const SidebarUnits: React.FC<SidebarUnitsProps> = ({ onlineUsers, allProfiles, currentUserId }) => {
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
  if (currentUserId) onlineIds.add(currentUserId); // Force self to be online
  
  const sortedUsers = [...allProfiles].sort((a, b) => {
    const aOnline = onlineIds.has(a.id);
    const bOnline = onlineIds.has(b.id);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    
    const aLastSeen = a.last_seen || 0;
    const bLastSeen = b.last_seen || 0;
    return bLastSeen - aLastSeen;
  });

  const now = Date.now();
  const THIRTY_MINS = 30 * 60 * 1000;

  return (
    <div className="mb-4 space-y-1">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 flex items-center justify-between">
            <span>حالة القوات ({onlineIds.size} متصل)</span>
            <Users size={12} />
        </h3>
        {sortedUsers.slice(0, 15).map(u => {
            const isMe = u.id === currentUserId;
            const isOnline = onlineIds.has(u.id);
            const onlineUser = onlineUsers.find(ou => ou.id === u.id);
            
            const lastSeenDelta = now - (u.last_seen || 0);
            const isBackground = !isOnline && lastSeenDelta < THIRTY_MINS;
            
            // If it's me, assume 'patrol' or online unless specific logic passed
            let status = isOnline ? (onlineUser?.status || (isMe ? 'patrol' : 'patrol')) : 'offline';
            
            let dotColor = isOnline ? statusColors[status] : isBackground ? 'bg-orange-500' : 'bg-red-500';
            let textColor = isOnline ? 'text-slate-200' : isBackground ? 'text-orange-200' : 'text-slate-500';
            let bgColor = isOnline ? 'bg-slate-800/40' : isBackground ? 'bg-orange-900/10' : 'bg-red-900/5';
            let borderColor = isOnline ? 'border-slate-700/50' : isBackground ? 'border-orange-900/30' : 'border-red-900/20';

            return (
                <div key={u.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${bgColor} ${borderColor}`}>
                        <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${dotColor} ${isOnline ? 'animate-pulse' : ''}`}></div>
                        <div className="flex flex-col">
                            <span className={`text-xs font-bold ${textColor}`}>
                                {u.username}
                                {isMe && <span className="text-[9px] bg-slate-700 text-slate-300 px-1 rounded mr-2">أنت</span>}
                            </span>
                            <div className="flex items-center gap-1">
                                {isOnline && <span className="text-[9px] text-slate-500">{statusLabels[status]}</span>}
                                {isBackground && <span className="text-[9px] text-orange-400 flex items-center gap-0.5"><Clock size={8} /> نشط مؤخراً</span>}
                                {!isOnline && !isBackground && <span className="text-[9px] text-red-900/50">غائب</span>}
                            </div>
                        </div>
                        </div>
                </div>
            );
        })}
    </div>
  );
};
