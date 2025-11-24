
import React from 'react';
import { X, Navigation, MapPin, User, Shield } from 'lucide-react';
import { MapUser } from '../types';

interface UserCommandModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: MapUser | null;
  onIntercept: () => void;
  onDispatch: () => void;
}

export const UserCommandModal: React.FC<UserCommandModalProps> = ({
  isOpen,
  onClose,
  user,
  onIntercept,
  onDispatch
}) => {
  if (!isOpen || !user) return null;

  return (
    <div className="absolute inset-0 z-[1200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]">
      <div className="bg-slate-900/90 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/80">
          <div className="flex items-center gap-2">
             <div className="bg-blue-900/30 p-1.5 rounded-lg">
                <Shield className="text-blue-400 w-5 h-5" />
             </div>
             <span className="text-xs font-bold uppercase tracking-wider text-blue-400">Tactical Command</span>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-6 text-center">
            <div 
              className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-xl font-bold border-4 border-slate-800 shadow-xl"
              style={{ backgroundColor: user.color, boxShadow: `0 0 20px ${user.color}40` }}
            >
              <User className="text-white mix-blend-overlay" size={28} />
            </div>
            <h2 className="text-xl font-bold text-white mb-1">{user.username}</h2>
            <p className="text-slate-400 text-xs font-mono mb-6">
               LOC: {user.lat.toFixed(5)}, {user.lng.toFixed(5)}
            </p>

            <div className="grid gap-3">
               <button 
                 onClick={onIntercept}
                 className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-blue-900/20"
               >
                 <Navigation size={18} />
                 Intercept (Go to User)
               </button>

               <button 
                 onClick={onDispatch}
                 className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-purple-900/20"
               >
                 <MapPin size={18} />
                 Plan Route for User
               </button>
            </div>
        </div>
      </div>
    </div>
  );
};
