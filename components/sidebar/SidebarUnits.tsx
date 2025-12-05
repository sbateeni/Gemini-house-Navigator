
import React from 'react';
import { Users, Clock, Shield, Award, User, Lock, Scale } from 'lucide-react';
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
    judiciary: 'دائرة قضائية',
    user: 'عنصر',
    admin: 'مسؤول',
    banned: 'محظور'
  };

  const getRoleStyle = (role: string) => {
    if (role === 'super_admin' || role === 'admin') return 'bg-purple-900/40 text-purple-300 border-purple-700/50';
    if (role === 'governorate_admin') return 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50';
    if (role === 'center_admin') return 'bg-blue-900/40 text-blue-300 border-blue-700/50';
    if (role === 'judiciary') return 'bg-amber-900/40 text-amber-300 border-amber-700/50';
    if (role === 'officer') return 'bg-sky-900/40 text-sky-300 border-sky-700/50';
    if (role === 'banned') return 'bg-red-900/40 text-red-300 border-red-700/50';
    return 'bg-slate-700/40 text-slate-400 border-slate-600/50';
  };

  const onlineIds = new Set(onlineUsers.map(u => u.id));
  
  // Sort users: Online > Background (30min) > Offline
  const sortedUsers = [...allProfiles].sort((a, b) => {
    const aOnline = onlineIds.has(a.id);
    const bOnline = onlineIds.has(b.id);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    
    // If both offline, check last seen
    const aLastSeen = a.last_seen || 0;
    const bLastSeen = b.last_seen || 0;
    return bLastSeen - aLastSeen;
  });

  const now = Date.now();
  const THIRTY_MINS = 30 * 60 * 1000;

  return (
    <div className="mb-4 space-y-1">
        <h3 className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 flex items-center justify-between">
            <span>حالة القوات ({onlineUsers.length} متصل)</span>
            <Users size={12} />
        </h3>
        {sortedUsers.slice(0, 15).map(u => {
            const isOnline = onlineIds.has(u.id);
            const onlineUser = onlineUsers.find(ou => ou.id === u.id);
            
            // Check if user is "In Background" (Not connected to WS, but last_seen < 30 mins ago)
            const lastSeenDelta = now - (u.last_seen || 0);
            const isBackground = !isOnline && lastSeenDelta < THIRTY_MINS;
            
            let status = isOnline ? (onlineUser?.status || 'patrol') : 'offline';
            let dotColor = isOnline ? statusColors[status] : isBackground ? 'bg-orange-500' : 'bg-red-500';
            let textColor = isOnline ? 'text-slate-200' : isBackground ? 'text-orange-200' : 'text-slate-500';
            let bgColor = isOnline ? 'bg-slate-800/40' : isBackground ? 'bg-orange-900/10' : 'bg-red-900/5';
            let borderColor = isOnline ? 'border-slate-700/50' : isBackground ? 'border-orange-900/30' : 'border-red-900/20';

            return (
                <div key={u.id} className={`flex items-center justify-between px-3 py-2 rounded-lg border ${bgColor} ${borderColor}`}>
                        <div className="flex items-center gap-2 w-full">
                            {/* Status Dot */}
                            <div className={`w-2 h-2 shrink-0 rounded-full ${dotColor} ${isOnline ? 'animate-pulse' : ''}`}></div>
                            
                            <div className="flex flex-col w-full min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className={`text-xs font-bold truncate ${textColor}`}>{u.username}</span>
                                    
                                    {/* Rank Badge */}
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getRoleStyle(u.role)} flex items-center gap-1 shrink-0`}>
                                        {u.role === 'super_admin' && <Shield size={8} />}
                                        {u.role === 'judiciary' && <Scale size={8} />}
                                        {u.role === 'officer' && <Award size={8} />}
                                        {roleLabels[u.role] || 'عنصر'}
                                    </span>
                                </div>

                                <div className="flex items-center gap-1 mt-0.5">
                                    {isOnline && <span className="text-[9px] text-slate-500">{statusLabels[status]}</span>}
                                    {isBackground && <span className="text-[9px] text-orange-400 flex items-center gap-0.5"><Clock size={8} /> نشط مؤخراً</span>}
                                    {!isOnline && !isBackground && <span className="text-[9px] text-red-900/50">غائب</span>}
                                    
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
