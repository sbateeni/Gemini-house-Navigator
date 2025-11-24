
import React from 'react';
import { Siren } from 'lucide-react';

interface SOSButtonProps {
  isActive: boolean;
  onToggle: () => void;
}

export const SOSButton: React.FC<SOSButtonProps> = ({ isActive, onToggle }) => {
  return (
    <button 
      onClick={onToggle}
      className={`
        fixed bottom-24 right-4 z-[500] 
        w-16 h-16 rounded-full flex items-center justify-center 
        shadow-2xl border-4 transition-all duration-300
        ${isActive 
          ? 'bg-red-600 border-red-400 animate-pulse scale-110 shadow-red-900/50' 
          : 'bg-slate-900 border-slate-700 hover:bg-red-900/20 hover:border-red-900/50'}
      `}
      title={isActive ? "CANCEL SOS" : "TRIGGER SOS"}
    >
      <Siren 
        size={32} 
        className={`transition-all ${isActive ? 'text-white animate-spin' : 'text-red-500'}`} 
      />
      
      {/* Ripple Effect when Active */}
      {isActive && (
        <>
          <div className="absolute inset-0 rounded-full border-4 border-red-500 animate-ping opacity-75"></div>
          <div className="absolute inset-[-10px] rounded-full border-2 border-red-500 animate-ping opacity-50 delay-75"></div>
        </>
      )}
    </button>
  );
};
