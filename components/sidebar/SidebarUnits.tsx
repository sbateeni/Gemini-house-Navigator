
import React from 'react';
import { Users, Clock, Shield, Award, WifiOff } from 'lucide-react';
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

  const roleLabels: Record<string, string> = {
    super_admin: 'قائد عام',
    governorate_admin: 'مدير محافظة',
    center_admin: 'مدير مركز',
    officer: 'ضابط',
    user: 'عنصر',
    admin: 'مسؤول',
    banned: 'محظور'
  };

  const getRoleStyle = (role: string) => {
    if (role === 'super_admin' || role === 'admin') return 'bg-purple-900/40 text-purple-300 border-purple-700/50';
    if (role === 'governorate_admin') return 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50';
    if (role === 'center_admin') return 'bg-blue-900/40 text-blue-300 border-blue-700/50';
    if (role === 'officer') return 'bg-sky-900/40 text-sky-300 border-sky-700/50';
    if (role === 'banned') return 'bg-red-900/40 text-red-300 border-red-700/50';
    return 'bg-slate-700/40 text-slate-400 border-slate-600/50';
  };

  const onlineIds = new Set(onlineUsers.map(u => u.id));
  
  // Sort users: Online > Background > Offline
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
  const BACKGROUND_THRESHOLD = 30 * 60 * 1000; // 30 minutes

  return (
    <div className="mb-4 space-y-1">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 flex items-center justify-between">
            <span>حالة القوات ({onlineUsers.length} مرصود)</span>
            <Users size={12} />
        </h3>
        {sortedUsers.slice(0, 15).map(u => {
            const mapUser = onlineUsers.find(ou => ou.id === u.id);
            // Check if mapUser exists. If it exists, it means it's either LIVE or BACKGROUND (fetched via usePresence)
            // usePresence filters DB users by 30 mins.
            
            const isVisibleOnMap = !!mapUser;
            const isLive = mapUser?.isOnline === true;
            
            // Check true offline status (longer than 30 mins)
            const lastSeenDelta = now - (u.last_seen || 0);
            const isTrulyOffline = !isVisibleOnMap;

            let status = isVisibleOnMap ? (mapUser?.status || 'patrol') : 'offline';
            
            // UI States
            let dotColor, textColor, bgColor, borderColor, statusText;

            if (isLive) {
                // Fully Online
                dotColor = statusColors[status];
                textColor = 'text-slate-200';
                bgColor = 'bg-slate-800/40';
                borderColor = 'border-slate-700/50';
                statusText = statusLabels[status];
            } else if (isVisibleOnMap) {
                // Background / Signal Lost (Within 30 mins)
                dotColor = 'bg-orange-500';
                textColor = 'text-orange-200';
                bgColor = 'bg-orange-900/10';
                borderColor = 'border-orange-900/30';
                const minsAgo = Math.floor(lastSeenDelta / 60000);
                statusText = `فقدان إشارة (منذ ${minsAgo}د)`;
            } else {
                // Offline (> 30 mins)
                dotColor = 'bg-red-900';
                textColor = 'text-slate-500';
                bgColor = 'bg-red-900/5';
                borderColor = 'border-red-900/20';
                statusText = 'غير متصل';
            }

            return (
                <div key={u.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${bgColor} ${borderColor}`}>
                        <div className="flex items-center gap-2 w-full">
                            {/* Status Dot */}
                            <div className={`w-2 h-2 shrink-0 rounded-full ${dotColor} ${isLive ? 'animate-pulse' : ''}`}></div>
                            
                            <div className="flex flex-col w-full min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`text-xs font-bold truncate ${textColor}`}>{u.username}</span>
                                    
                                    {/* Rank Badge */}
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getRoleStyle(u.role)} flex items-center gap-1 shrink-0`}>
                                        {u.role === 'super_admin' && <Shield size={8} />}
                                        {u.role === 'officer' && <Award size={8} />}
                                        {roleLabels[u.role] || 'عنصر'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 mt-0.5">
                                    {!isLive && isVisibleOnMap && <WifiOff size={8} className="text-orange-400" />}
                                    <span className={`text-[9px] ${!isLive && isVisibleOnMap ? 'text-orange-400 font-bold' : 'text-slate-500'}`}>
                                        {statusText}
                                    </span>
                                    
                                    {/* Optional Location Text */}
                                    {u.governorate && (
                                        <span className="text-[9px] text-slate-600 mr-auto truncate dir-rtl">
                                            {u.center ? ` - ${u.center}` : ` - ${u.governorate}`}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                </div>
            );
        })}
    </div>
  );
};
