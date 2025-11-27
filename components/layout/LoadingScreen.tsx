


import React from 'react';
import { Loader2, Shield } from 'lucide-react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden" dir="rtl">
      {/* Background Pulse */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center">
        <div className="w-20 h-20 bg-slate-900/80 backdrop-blur-xl border border-slate-700 rounded-2xl flex items-center justify-center shadow-2xl mb-6">
          <Shield className="text-blue-500 w-10 h-10 animate-pulse" />
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">نظام العمليات الجغرافية</h1>
        
        <div className="flex items-center gap-3 text-slate-400 text-sm font-mono">
          <Loader2 className="animate-spin text-blue-500" size={16} />
          <span>جاري تهيئة النظام الآمن...</span>
        </div>
      </div>
    </div>
  );
};
