
import React from 'react';
import { Plane, Compass, Wind, Navigation, Sparkles, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Plus, Minus, Activity } from 'lucide-react';

interface FlightHUDProps {
  speed: number;
  heading: number;
  altitude: number;
  isFlying: boolean;
  onControl: (action: 'left' | 'right' | 'up' | 'down' | 'faster' | 'slower') => void;
  onAskAI: () => void;
  isAILoading: boolean;
}

export const FlightHUD: React.FC<FlightHUDProps> = ({ 
  speed, heading, altitude, isFlying, onControl, onAskAI, isAILoading 
}) => {
  const displaySpeed = Math.round(speed * 100000);
  const displayAlt = Math.round(altitude);

  return (
    <div className="absolute inset-0 pointer-events-none z-[2000] flex flex-col justify-between p-4 md:p-8 overflow-hidden select-none" dir="rtl">
      {/* Top Bar: Compass & Status */}
      <div className="flex justify-between items-start">
        <div className="glass-panel px-6 py-2 rounded-2xl flex items-center gap-4 shadow-2xl border-b-2 border-blue-500/50">
          <Compass className="text-blue-400 animate-spin-slow" size={20} />
          <div className="flex flex-col items-start">
             <span className="text-[10px] text-blue-400/70 font-bold uppercase tracking-widest">الاتجاه المغناطيسي</span>
             <span className="font-mono text-xl font-black text-white">{Math.round((heading + 360) % 360)}°</span>
          </div>
        </div>

        <div className="glass-panel px-4 py-3 rounded-2xl flex items-center gap-3 border-b-2 border-emerald-500/50">
          <div className="flex flex-col items-end">
             <span className="text-[10px] text-emerald-400/70 font-bold uppercase tracking-widest">حالة المحرك</span>
             <span className="text-xs font-bold text-white">{isFlying ? 'مُحلق' : 'مستعد للإقلاع'}</span>
          </div>
          <div className={`w-3 h-3 rounded-full ${isFlying ? 'bg-emerald-500 animate-pulse shadow-[0_0_10px_#10b981]' : 'bg-slate-600'}`}></div>
        </div>
      </div>

      {/* Center Crosshair / Horizon */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="relative w-72 h-72 border border-blue-500/10 rounded-full flex items-center justify-center">
              {/* Artificial Horizon Lines */}
              <div className="absolute w-full h-px bg-blue-500/5 top-1/2"></div>
              <div className="absolute h-full w-px bg-blue-500/5 left-1/2"></div>
              
              <div className="w-16 h-px bg-blue-400/40"></div>
              <div className="h-16 w-px bg-blue-400/40 absolute"></div>
              
              <Plane 
                className="text-blue-500 drop-shadow-[0_0_20px_rgba(59,130,246,0.9)] transition-transform duration-500 ease-out" 
                size={64} 
                style={{ transform: `rotate(${heading}deg)` }} 
              />
          </div>
          <div className="mt-4 glass-panel px-4 py-1 rounded-full border border-blue-500/20">
              <span className="text-[10px] text-blue-400 font-mono tracking-tighter">FLIGHT SYSTEM v3.0 // ACTIVE PATH</span>
          </div>
      </div>

      {/* Flight Controls & Gauges */}
      <div className="flex justify-between items-end gap-4">
        {/* Left Side: Gauges */}
        <div className="flex flex-col gap-3">
          <div className="glass-panel border-r-4 border-blue-500 p-4 rounded-xl shadow-2xl min-w-[140px]">
            <div className="text-[9px] text-blue-400 font-black uppercase mb-1 flex items-center gap-1">
              <Wind size={12} /> السرعة الجوية
            </div>
            <div className="text-4xl font-black font-mono text-white tabular-nums tracking-tighter">
              {displaySpeed}
            </div>
            <div className="text-[10px] text-slate-500 font-bold">KM/H // MACH { (speed * 10).toFixed(2) }</div>
          </div>
          
          <div className="glass-panel border-r-4 border-emerald-500 p-4 rounded-xl shadow-2xl min-w-[140px]">
            <div className="text-[9px] text-emerald-400 font-black uppercase mb-1 flex items-center gap-1">
              <Activity size={12} /> الارتفاع الحالي
            </div>
            <div className="text-4xl font-black font-mono text-white tabular-nums tracking-tighter">
              {displayAlt}
            </div>
            <div className="text-[10px] text-slate-500 font-bold">FEET // AMSL</div>
          </div>
        </div>

        {/* Center: AI Assistant */}
        <div className="flex flex-col items-center gap-4">
            <button 
                onClick={onAskAI}
                disabled={isAILoading}
                className="pointer-events-auto bg-gradient-to-tr from-blue-700 via-blue-500 to-purple-500 p-6 rounded-full shadow-[0_0_40px_rgba(59,130,246,0.5)] hover:scale-110 active:scale-95 transition-all border-4 border-slate-950 group relative"
            >
                <div className="absolute inset-0 bg-white/20 rounded-full animate-ping opacity-20 pointer-events-none"></div>
                <Sparkles className={`text-white ${isAILoading ? 'animate-spin' : 'group-hover:rotate-12'}`} size={32} />
            </button>
            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-slate-950/50 px-3 py-1 rounded-full border border-blue-500/20">مساعد الطيار ذكي</span>
        </div>

        {/* Right Side: Navigation Joystick */}
        <div className="pointer-events-auto flex flex-col items-center gap-2">
            <div className="grid grid-cols-3 gap-1 bg-slate-950/80 p-3 rounded-[2.5rem] backdrop-blur-2xl border border-white/5 shadow-2xl">
                <div />
                <button onClick={() => onControl('faster')} className="w-12 h-12 flex items-center justify-center bg-blue-600/20 hover:bg-blue-600 text-white rounded-full transition-all border border-blue-500/30 group">
                    <Plus size={20} className="group-active:scale-125 transition-transform" />
                </button>
                <div />
                
                <button onClick={() => onControl('left')} className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-all border border-slate-700">
                    <ChevronLeft size={20} />
                </button>
                <button onClick={() => onControl('slower')} className="w-12 h-12 flex items-center justify-center bg-red-600/20 hover:bg-red-600 text-white rounded-full transition-all border border-red-500/30 group">
                    <Minus size={20} className="group-active:scale-125 transition-transform" />
                </button>
                <button onClick={() => onControl('right')} className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-all border border-slate-700">
                    <ChevronRight size={20} />
                </button>
                
                <div />
                <button onClick={() => onControl('down')} className="w-12 h-12 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded-full transition-all border border-slate-700">
                    <ChevronDown size={20} />
                </button>
                <div />
            </div>
            <div className="flex gap-2">
                <button onClick={() => onControl('up')} className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-4 py-1 rounded-lg text-[10px] font-bold border border-emerald-500/30 transition-all">إرتفاع</button>
                <button onClick={() => onControl('down')} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white px-4 py-1 rounded-lg text-[10px] font-bold border border-red-500/30 transition-all">هبوط</button>
            </div>
        </div>
      </div>
    </div>
  );
};
