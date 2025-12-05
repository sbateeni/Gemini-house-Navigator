
import React from 'react';
import { Menu, Navigation, Layers, Globe, Loader2, X, Plane } from 'lucide-react';
import { NotificationBell } from './NotificationBell';
import { Assignment } from '../types';

interface MapControlsProps {
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  isSatellite: boolean;
  setIsSatellite: (s: boolean) => void;
  onLocateUser: () => void;
  isLocating?: boolean;
  assignments: Assignment[];
  onAcceptAssignment: (a: Assignment) => void;
  hasActiveRoute: boolean;
  onClearRoute: () => void;
  isFlightMode?: boolean;
  setIsFlightMode?: (v: boolean) => void;
}

export const MapControls: React.FC<MapControlsProps> = ({
  sidebarOpen,
  setSidebarOpen,
  isSatellite,
  setIsSatellite,
  onLocateUser,
  isLocating = false,
  assignments,
  onAcceptAssignment,
  hasActiveRoute,
  onClearRoute,
  isFlightMode,
  setIsFlightMode
}) => {
  return (
    <div className="absolute top-4 left-4 z-[400] flex flex-col gap-3">
       {/* Sidebar Toggle */}
       <button 
         onClick={() => setSidebarOpen(!sidebarOpen)}
         className={`w-12 h-12 backdrop-blur text-white rounded-full shadow-xl border border-slate-700 flex items-center justify-center active:scale-95 transition-all
           ${sidebarOpen ? 'bg-blue-600 border-blue-500' : 'bg-slate-900/90 hover:bg-slate-800'}
         `}
         title={sidebarOpen ? "إغلاق القائمة" : "فتح القائمة"}
       >
         <Menu size={24} />
       </button>

       {/* Flight Mode Toggle */}
       {setIsFlightMode && (
           <button 
             onClick={() => setIsFlightMode(!isFlightMode)}
             className={`w-12 h-12 rounded-full shadow-xl border flex items-center justify-center transition-all active:scale-95 ${isFlightMode ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/30' : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'}`}
             title="وضع الطيران"
           >
             <Plane size={24} className={isFlightMode ? 'animate-pulse' : ''} />
           </button>
       )}

       {/* Clear Route Button - Only shows when routing */}
       {hasActiveRoute && (
         <button 
           onClick={onClearRoute}
           className="w-12 h-12 bg-red-600 text-white rounded-full shadow-xl border border-red-500 flex items-center justify-center hover:bg-red-500 active:scale-95 transition-all animate-in zoom-in duration-300"
           title="إلغاء المسار الحالي"
         >
           <X size={24} />
         </button>
       )}

       <button 
         onClick={onLocateUser}
         disabled={isLocating}
         className="w-12 h-12 bg-blue-600 text-white rounded-full shadow-xl border border-blue-500 flex items-center justify-center hover:bg-blue-500 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-wait"
         title="موقعي الحالي"
       >
         {isLocating ? <Loader2 size={24} className="animate-spin" /> : <Navigation size={24} />}
       </button>
       
       <button 
         onClick={() => setIsSatellite(!isSatellite)}
         className={`w-12 h-12 rounded-full shadow-xl border flex items-center justify-center transition-all active:scale-95 ${isSatellite ? 'bg-slate-900 text-white border-slate-700' : 'bg-slate-900 text-slate-400 border-slate-700'}`}
         title="تغيير نمط الخريطة"
       >
         {isSatellite ? <Globe size={24} /> : <Layers size={24} />}
       </button>

       {/* Notifications Bell */}
       <NotificationBell 
         assignments={assignments}
         onAccept={onAcceptAssignment}
       />
    </div>
  );
};
