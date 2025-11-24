import React from 'react';

export const PlaneView: React.FC = () => {
  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
      <div className="relative animate-float">
        {/* Jet Fighter SVG */}
        <svg
          width="320"
          height="320"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.5"
          className="text-white drop-shadow-2xl transition-transform duration-1000"
          style={{ 
            filter: 'drop-shadow(0px 20px 20px rgba(0,0,0,0.6))',
            transform: 'rotateX(20deg)'
          }}
        >
          {/* Main Body */}
          <path d="M50 10 L55 35 L65 80 L50 90 L35 80 L45 35 Z" fill="#1f2937" stroke="#4ade80" strokeWidth="1" />
          
          {/* Cockpit Canopy */}
          <path d="M48 30 L52 30 L52 45 L48 45 Z" fill="#38bdf8" className="opacity-80" />
          
          {/* Wings */}
          <path d="M45 45 L10 65 L45 70 Z" fill="#111827" stroke="#4ade80" />
          <path d="M55 45 L90 65 L55 70 Z" fill="#111827" stroke="#4ade80" />
          
          {/* Rear Stabilizers */}
          <path d="M42 80 L30 90 L45 88 Z" fill="#111827" stroke="#4ade80" />
          <path d="M58 80 L70 90 L55 88 Z" fill="#111827" stroke="#4ade80" />
          
          {/* Engine Glow */}
          <circle cx="46" cy="90" r="2" className="fill-orange-500 animate-pulse" />
          <circle cx="54" cy="90" r="2" className="fill-orange-500 animate-pulse" />
        </svg>

        {/* Dynamic Contrails */}
        <div className="absolute top-[85%] left-1/2 -translate-x-1/2 flex space-x-6">
          <div className="w-1 h-48 bg-gradient-to-b from-white/60 to-transparent blur-md"></div>
          <div className="w-1 h-48 bg-gradient-to-b from-white/60 to-transparent blur-md"></div>
        </div>
      </div>
      
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-10px) rotate(1deg); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};