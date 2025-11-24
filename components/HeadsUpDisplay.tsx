import React, { useEffect, useState } from 'react';
import { FlightStatus } from '../types';

interface HeadsUpDisplayProps {
  status: FlightStatus;
  locationName: string;
}

export const HeadsUpDisplay: React.FC<HeadsUpDisplayProps> = ({ status, locationName }) => {
  const [pitch, setPitch] = useState(0);
  const [roll, setRoll] = useState(0);
  
  // Simulate flight movements
  useEffect(() => {
    const interval = setInterval(() => {
      const time = Date.now() / 2000;
      setPitch(Math.sin(time) * 5); // Gentle pitch
      setRoll(Math.cos(time * 0.5) * 3); // Gentle bank
    }, 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 md:p-8 crt-effect text-green-500 overflow-hidden font-mono tracking-wider">
      {/* Top Telemetry */}
      <div className="flex justify-between items-start">
        <div className="bg-black/40 backdrop-blur-sm border-l-4 border-green-500 pl-3 p-2 rounded-r">
          <div className="text-xs text-green-600">TARGET</div>
          <div className="text-lg font-bold text-white drop-shadow-md">{locationName}</div>
          <div className="text-xs mt-1">RADAR: <span className="animate-pulse text-green-300">SCANNING</span></div>
        </div>
        
        {/* Compass Tape */}
        <div className="relative overflow-hidden w-64 h-12 bg-black/40 border-x border-green-500/50 rounded flex justify-center items-center">
          <div className="absolute top-0 bottom-0 w-0.5 bg-green-500 z-10"></div>
          <div className="flex space-x-8 text-lg font-bold opacity-80" style={{ transform: `translateX(${-status.heading % 360}px)` }}>
             {/* Simulated tape elements */}
             <span>N</span><span>15</span><span>30</span><span>NE</span><span>60</span><span>75</span>
             <span>E</span><span>105</span><span>120</span><span>SE</span><span>150</span><span>165</span>
             <span>S</span><span>195</span><span>210</span><span>SW</span><span>240</span><span>255</span>
             <span>W</span><span>285</span><span>300</span><span>NW</span><span>330</span><span>345</span>
          </div>
        </div>

        <div className="bg-black/40 backdrop-blur-sm border-r-4 border-green-500 pr-3 p-2 rounded-l text-right">
          <div className="text-xs text-green-600">SYSTEM TIME</div>
          <div className="text-lg font-bold text-white">{new Date().toLocaleTimeString()}</div>
          <div className="text-xs mt-1">FUEL: 82% | G: 1.0</div>
        </div>
      </div>

      {/* Center Reticle & Artificial Horizon */}
      <div className="absolute inset-0 flex items-center justify-center opacity-80"
           style={{ transform: `rotate(${roll}deg)` }}>
        {/* Crosshair */}
        <div className="w-8 h-8 border border-green-500/50 rounded-full flex items-center justify-center absolute z-10">
            <div className="w-1 h-1 bg-green-500 rounded-full"></div>
        </div>
        
        {/* Horizon Line */}
        <div className="w-full h-0.5 bg-green-500/20 absolute" style={{ transform: `translateY(${pitch * 10}px)` }}></div>
        
        {/* Pitch Ladder */}
        <div className="flex flex-col gap-8 items-center absolute" style={{ transform: `translateY(${pitch * 10}px)` }}>
           <div className="w-32 flex justify-between"><div className="w-8 h-0.5 bg-green-500"></div><span className="text-xs">10</span><div className="w-8 h-0.5 bg-green-500"></div></div>
           <div className="w-48 flex justify-between"><div className="w-12 h-0.5 bg-green-500"></div><span className="text-xs">0</span><div className="w-12 h-0.5 bg-green-500"></div></div>
           <div className="w-32 flex justify-between"><div className="w-8 h-0.5 bg-green-500"></div><span className="text-xs">-10</span><div className="w-8 h-0.5 bg-green-500"></div></div>
        </div>
      </div>

      {/* Bottom Telemetry */}
      <div className="flex justify-between items-end">
        {/* Speed Tape */}
        <div className="bg-black/40 p-3 rounded border border-green-500/30 flex flex-col items-center min-w-[100px]">
          <span className="text-xs text-green-600 mb-1">AIRSPEED</span>
          <span className="text-4xl font-bold text-white font-mono">{Math.floor(status.speed)}</span>
          <span className="text-xs text-green-400">KTS</span>
        </div>

        {/* Status Indicators */}
        <div className="flex flex-col items-center mb-4 gap-2">
             <div className="text-[10px] bg-green-900/50 px-2 py-0.5 rounded border border-green-500/30">
                TERRAIN FOLLOW: <span className="text-white">AUTO</span>
             </div>
             <div className="flex space-x-3">
                <div className={`w-3 h-3 rounded-full ${status.isFlying ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-900'}`}></div>
                <div className="w-3 h-3 rounded-full bg-yellow-900"></div>
                <div className="w-3 h-3 rounded-full bg-red-900"></div>
             </div>
        </div>

        {/* Altitude Tape */}
        <div className="bg-black/40 p-3 rounded border border-green-500/30 flex flex-col items-center min-w-[100px]">
          <span className="text-xs text-green-600 mb-1">ALTITUDE</span>
          <span className="text-4xl font-bold text-white font-mono">{Math.floor(status.altitude)}</span>
          <span className="text-xs text-green-400">FT MSL</span>
        </div>
      </div>
    </div>
  );
};