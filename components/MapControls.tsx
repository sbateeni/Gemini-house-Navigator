import React from 'react';
import { Menu, Navigation, Layers, Globe } from 'lucide-react';

interface MapControlsProps {
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  isSatellite: boolean;
  setIsSatellite: (s: boolean) => void;
  onLocateUser: () => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  sidebarOpen,
  setSidebarOpen,
  isSatellite,
  setIsSatellite,
  onLocateUser
}) => {
  return (
    <div className="absolute top-4 left-4 z-[400] flex flex-col gap-3">
       {/* Sidebar Toggle (Mobile) */}
       {!sidebarOpen && (
         <button 
           onClick={() => setSidebarOpen(true)}
           className="w-12 h-12 bg-slate-900/90 backdrop-blur text-white rounded-full shadow-xl border border-slate-700 flex items-center justify-center hover:bg-slate-800 active:scale-95 transition-all"
         >
           <Menu size={24} />
         </button>
       )}

       <button 
         onClick={onLocateUser}
         className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-xl border border-blue-500 flex items-center justify-center hover:bg-blue-500 active:scale-95 transition-all"
         title="موقعي الحالي"
       >
         <Navigation size={24} />
       </button>
       
       <button 
         onClick={() => setIsSatellite(!isSatellite)}
         className={`w-12 h-12 rounded-full shadow-xl border flex items-center justify-center transition-all active:scale-95 ${isSatellite ? 'bg-slate-900 text-white border-slate-700' : 'bg-slate-900 text-slate-400 border-slate-700'}`}
         title="تغيير نمط الخريطة"
       >
         {isSatellite ? <Globe size={24} /> : <Layers size={24} />}
       </button>
    </div>
  );
};