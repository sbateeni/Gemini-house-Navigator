
import React from 'react';
import { Siren, Navigation, Radio } from 'lucide-react';
import { MapUser } from '../types';

interface SOSAlertOverlayProps {
  sosUser: MapUser | undefined;
  onLocate: () => void;
}

export const SOSAlertOverlay: React.FC<SOSAlertOverlayProps> = ({ sosUser, onLocate }) => {
  if (!sosUser) return null;

  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1500] w-[90%] max-w-md animate-in slide-in-from-top-10 fade-in duration-300">
      <div className="bg-red-600/90 backdrop-blur-xl border-2 border-red-400 rounded-2xl shadow-[0_0_50px_rgba(220,38,38,0.6)] p-4 flex items-center justify-between gap-4 relative overflow-hidden">
        
        {/* Background Pulse Animation */}
        <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none"></div>
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-white/20 p-3 rounded-full border border-white/30 animate-spin-slow">
            <Siren className="text-white w-8 h-8" />
          </div>
          <div className="text-right">
            <h2 className="text-white font-black text-lg leading-none mb-1">نداء استغاثة!</h2>
            <div className="flex items-center gap-1 text-red-100 text-xs font-mono">
               <Radio size={12} className="animate-ping" />
               <span>الوحدة: {sosUser.username}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={onLocate}
          className="bg-white text-red-600 px-4 py-3 rounded-xl font-bold text-sm shadow-xl flex items-center gap-2 hover:scale-105 active:scale-95 transition-all z-10 border border-red-200"
        >
          <Navigation size={18} className="fill-current" />
          توجه للموقع
        </button>
      </div>
    </div>
  );
};
