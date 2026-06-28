import React from 'react';
import { Menu } from 'lucide-react';

interface MapControlsProps {
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
}

export const MapControls: React.FC<MapControlsProps> = ({ sidebarOpen, setSidebarOpen }) => (
  <div className="absolute left-4 top-4 z-[1000]">
    <button
      onClick={() => setSidebarOpen(!sidebarOpen)}
      className={`w-12 h-12 backdrop-blur text-white rounded-full shadow-xl border border-slate-700 flex items-center justify-center active:scale-95 transition-all ${
        sidebarOpen ? 'bg-blue-600 border-blue-500' : 'bg-slate-900/90 hover:bg-slate-800'
      }`}
      title={sidebarOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
    >
      <Menu size={24} />
    </button>
  </div>
);
