


import React, { useMemo } from 'react';
import { X, Navigation, MapPin, User, Shield, Crosshair } from 'lucide-react';
import { MapUser } from '../../types';

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

interface UserCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: MapUser | null;
  onIntercept: () => void;
  onDispatch: () => void;
  onlineUsers?: MapUser[];
  onNavigateNearest?: (nearestLat: number, nearestLng: number, targetLat: number, targetLng: number) => void;
}

export const UserCommandModal: React.FC<UserCommandModalProps> = ({
  isOpen,
  onClose,
  user,
  onIntercept,
  onDispatch,
  onlineUsers = [],
  onNavigateNearest
}) => {
  if (!isOpen || !user) return null;

  const nearest = useMemo<{ user: MapUser; distance: number } | null>(() => {
    if (!onlineUsers.length) return null;
    let best: MapUser | null = null;
    let bestDist = Infinity;
    for (const u of onlineUsers) {
      if (u.id === user.id || (u.lat === 0 && u.lng === 0)) continue;
      const d = haversine(user.lat, user.lng, u.lat, u.lng);
      if (d < bestDist) { bestDist = d; best = u; }
    }
    return best ? { user: best, distance: bestDist } : null;
  }, [onlineUsers, user]);

  return (
    <div className="absolute inset-0 z-[1200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
          <div className="flex items-center gap-2">
             <div className="bg-blue-900/30 p-1.5 rounded-lg">
                <Shield className="text-blue-400 w-5 h-5" />
             </div>
             <span className="text-xs font-bold uppercase tracking-wider text-blue-400">قيادة ميدانية</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <div 
                className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold border-4 border-slate-800 shrink-0"
                style={{ backgroundColor: user.color, boxShadow: `0 0 20px ${user.color}40` }}
              >
                <User className="text-white mix-blend-overlay" size={24} />
              </div>
              <div className="text-right">
                <h2 className="text-lg font-bold text-white">{user.username}</h2>
                <p className="text-slate-400 text-xs font-mono">
                   {user.lat.toFixed(4)}, {user.lng.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Nearest Unit Section */}
            {nearest && (
              <div className="bg-emerald-900/20 border border-emerald-800/30 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2 text-emerald-400 text-[11px] font-bold mb-2">
                  <Crosshair size={14} />
                  <span>أقرب وحدة متاحة</span>
                </div>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 border-emerald-700 shrink-0"
                    style={{ backgroundColor: nearest.user.color }}
                  >
                    <User className="text-white mix-blend-overlay" size={14} />
                  </div>
                  <div className="flex-1">
                    <span className="text-white font-bold text-sm">{nearest.user.username}</span>
                    <span className="text-emerald-300 text-xs mr-2 font-mono">{nearest.distance < 1 ? `${(nearest.distance * 1000).toFixed(0)} م` : `${nearest.distance.toFixed(1)} كم`}</span>
                  </div>
                  {onNavigateNearest && (
                    <button 
                      onClick={() => onNavigateNearest(nearest.user.lat, nearest.user.lng, user.lat, user.lng)}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95"
                    >
                      <Navigation size={14} />
                      توجيه
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-3">
               <button 
                 onClick={onIntercept}
                 className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
               >
                 <Navigation size={18} />
                 الذهاب إلى الموقع
               </button>

               <button 
                 onClick={onDispatch}
                 className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-purple-900/20"
               >
                 <MapPin size={18} />
                 توجيه أوامر للوحدة
               </button>
            </div>
        </div>
      </div>
    </div>
  );
};
