
import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, ArrowDown, RotateCcw, RotateCw, X } from 'lucide-react';

interface FlightHUDProps {
    onClose: () => void;
}

export const FlightHUD: React.FC<FlightHUDProps> = ({ onClose }) => {
    // We emit custom events that LeafletMap listens to
    
    const emitInput = (x: number, y: number) => {
        window.dispatchEvent(new CustomEvent('flight-input', { detail: { x, y } }));
    };

    // Touch handlers for continuous press
    const intervalRef = useRef<number | null>(null);

    const startInput = (x: number, y: number) => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        emitInput(x, y);
        intervalRef.current = window.setInterval(() => emitInput(x, y), 50);
    };

    const stopInput = () => {
        if (intervalRef.current) clearInterval(intervalRef.current);
        emitInput(0, 0); // Reset or hold? Simplification: Reset turn, hold speed is logic in Leaflet
    };

    return (
        <div className="absolute inset-0 z-[1000] pointer-events-none flex flex-col justify-between p-6">
            
            {/* Top Bar */}
            <div className="pointer-events-auto flex justify-between items-start">
                <div className="bg-slate-900/80 p-4 rounded-xl border border-blue-500/50 backdrop-blur">
                    <h2 className="text-blue-400 font-bold text-lg leading-none">FLIGHT MODE</h2>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">
                        WASD / ARROWS to Fly
                    </p>
                </div>
                <button 
                    onClick={onClose}
                    className="bg-red-600/80 p-2 rounded-full text-white hover:bg-red-500 pointer-events-auto"
                >
                    <X size={24} />
                </button>
            </div>

            {/* Mobile Controls (Visible on Touch devices primarily, but shown here for all) */}
            <div className="pointer-events-auto flex justify-between items-end pb-8 md:hidden">
                {/* Speed Controls (Left) */}
                <div className="flex flex-col gap-4">
                    <button 
                        onTouchStart={() => startInput(0, 1)} 
                        onTouchEnd={stopInput}
                        onMouseDown={() => startInput(0, 1)}
                        onMouseUp={stopInput}
                        className="w-16 h-16 bg-slate-800/80 rounded-full border border-slate-600 flex items-center justify-center active:bg-blue-600 active:border-blue-400"
                    >
                        <ArrowUp size={32} className="text-white" />
                    </button>
                    <button 
                        onTouchStart={() => startInput(0, -1)} 
                        onTouchEnd={stopInput}
                        onMouseDown={() => startInput(0, -1)}
                        onMouseUp={stopInput}
                        className="w-16 h-16 bg-slate-800/80 rounded-full border border-slate-600 flex items-center justify-center active:bg-red-600 active:border-red-400"
                    >
                        <ArrowDown size={32} className="text-white" />
                    </button>
                </div>

                {/* Turn Controls (Right) */}
                <div className="flex gap-4">
                     <button 
                        onTouchStart={() => startInput(-1, 0)} 
                        onTouchEnd={stopInput}
                        onMouseDown={() => startInput(-1, 0)}
                        onMouseUp={stopInput}
                        className="w-20 h-20 bg-slate-800/80 rounded-full border border-slate-600 flex items-center justify-center active:bg-purple-600 active:border-purple-400"
                    >
                        <RotateCcw size={32} className="text-white" />
                    </button>
                    <button 
                        onTouchStart={() => startInput(1, 0)} 
                        onTouchEnd={stopInput}
                        onMouseDown={() => startInput(1, 0)}
                        onMouseUp={stopInput}
                        className="w-20 h-20 bg-slate-800/80 rounded-full border border-slate-600 flex items-center justify-center active:bg-purple-600 active:border-purple-400"
                    >
                        <RotateCw size={32} className="text-white" />
                    </button>
                </div>
            </div>
        </div>
    );
};
