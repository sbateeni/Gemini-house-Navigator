import React, { useState } from 'react';
import { Users, Shield, Award, WifiOff, Scale, ChevronDown, ChevronUp } from 'lucide-react';
import { MapUser, UserProfile } from '../../../types';

interface SidebarUnitsProps {
  onlineUsers: MapUser[];
  allProfiles: UserProfile[];
  currentUserId?: string;
}

const STATUS_CONFIG = {
  patrol: { dot: 'bg-green-500', label: 'دورية' },
  busy: { dot: 'bg-yellow-500', label: 'مشغول' },
  pursuit: { dot: 'bg-red-500', label: 'مطاردة' },
  offline: { dot: 'bg-slate-500', label: 'غير متصل' },
};

const ROLE_STYLES: Record<string, string> = {
  super_admin: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  admin: 'bg-purple-900/40 text-purple-300 border-purple-700/50',
  governorate_admin: 'bg-indigo-900/40 text-indigo-300 border-indigo-700/50',
  center_admin: 'bg-blue-900/40 text-blue-300 border-blue-700/50',
  judicial: 'bg-teal-900/40 text-teal-300 border-teal-700/50',
  officer: 'bg-sky-900/40 text-sky-300 border-sky-700/50',
  banned: 'bg-red-900/40 text-red-300 border-red-700/50',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'قائد عام', governorate_admin: 'مدير محافظة', center_admin: 'مدير مركز',
  judicial: 'ضابط قضائية', officer: 'ضابط', user: 'عنصر', admin: 'مسؤول', banned: 'محظور',
};

export const SidebarUnits: React.FC<SidebarUnitsProps> = ({ onlineUsers, allProfiles, currentUserId }) => {
  const [showAll, setShowAll] = useState(false);
  const onlineIds = new Set(onlineUsers.map((u) => u.id));

  const sortedUsers = [...allProfiles].sort((a, b) => {
    const aOnline = onlineIds.has(a.id);
    const bOnline = onlineIds.has(b.id);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return (b.last_seen || 0) - (a.last_seen || 0);
  });

  const visibleUsers = showAll ? sortedUsers : sortedUsers.slice(0, 5);
  const totalCount = sortedUsers.length;
  const onlineCount = onlineUsers.length;

  const totalHidden = sortedUsers.length - visibleUsers.length;

  const getUserUI = (u: UserProfile) => {
    const mapUser = onlineUsers.find((ou) => ou.id === u.id);
    const isSelf = u.id === currentUserId;
    const isVisibleOnMap = !!mapUser || isSelf;
    const isLive = mapUser?.isOnline === true || isSelf;
    const status = isVisibleOnMap ? (mapUser?.status || 'patrol') : 'offline';

    if (isLive) {
      return { dot: STATUS_CONFIG[status].dot, textColor: 'text-slate-200', bgColor: 'bg-slate-800/40', borderColor: 'border-slate-700/50', statusText: STATUS_CONFIG[status].label, pulse: true, isLive: true };
    }
    if (isVisibleOnMap) {
      return { dot: 'bg-orange-500', textColor: 'text-orange-200', bgColor: 'bg-orange-900/10', borderColor: 'border-orange-900/30', statusText: 'فقدان إشارة', pulse: false, isLive: false };
    }
    return { dot: 'bg-red-900', textColor: 'text-slate-500', bgColor: 'bg-red-900/5', borderColor: 'border-red-900/20', statusText: 'غير متصل', pulse: false, isLive: false };
  };

  return (
    <div className="space-y-1">
      <h3 className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-1 flex items-center justify-between">
        <span>القوات ({onlineCount} متصل)</span>
        <Users size={12} />
      </h3>
      {visibleUsers.map((u) => {
        const ui = getUserUI(u);
        return (
          <div key={u.id} className={`flex items-start justify-between px-3 py-2 rounded-lg border ${ui.bgColor} ${ui.borderColor}`}>
            <div className="flex items-start gap-2 w-full min-w-0">
              <div className={`w-2 h-2 shrink-0 rounded-full ${ui.dot} ${ui.pulse ? 'animate-pulse' : ''}`} />
              <div className="flex flex-col w-full min-w-0 gap-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-xs font-bold truncate ${ui.textColor}`}>{u.username}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${ROLE_STYLES[u.role] || 'bg-slate-700/40 text-slate-400 border-slate-600/50'} flex items-center gap-1 shrink-0`}>
                    {u.role === 'super_admin' && <Shield size={8} />}
                    {u.role === 'judicial' && <Scale size={8} />}
                    {u.role === 'officer' && <Award size={8} />}
                    {ROLE_LABELS[u.role] || 'عنصر'}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {!ui.isLive && (onlineIds.has(u.id) || u.id === currentUserId) && <WifiOff size={8} className="text-orange-400" />}
                  <span className={`text-[9px] ${!ui.isLive && (onlineIds.has(u.id) || u.id === currentUserId) ? 'text-orange-400 font-bold' : 'text-slate-500'}`}>{ui.statusText}</span>
                  {u.governorate && <span className="text-[9px] text-slate-600 mr-auto">{u.center ? ` - ${u.center}` : ` - ${u.governorate}`}</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {totalHidden > 0 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full flex items-center justify-center gap-1 py-2 text-[10px] font-bold text-blue-400 hover:text-blue-300 hover:bg-slate-800/30 rounded-lg transition-colors"
        >
          {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {showAll ? 'عرض أقل' : `عرض الكل (${totalCount})`}
        </button>
      )}
    </div>
  );
};
