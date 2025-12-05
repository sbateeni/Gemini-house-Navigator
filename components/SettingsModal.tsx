
import React from 'react';
import { X, Map, Shield, User } from 'lucide-react';
import { UserRole } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  userRole: UserRole | null;
  mapProvider: string;
  setMapProvider: (val: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen, onClose, user, userRole, mapProvider, setMapProvider
}) => {
  if (!isOpen) return null;

  const mapOptions = [
    { id: 'google', name: 'Google Hybrid', type: 'satellite' },
    { id: 'google_streets', name: 'Google Streets', type: 'street' },
    { id: 'google_terrain', name: 'Google Terrain', type: 'terrain' },
    { id: 'esri', name: 'Esri Satellite', type: 'satellite' },
    { id: 'esri_streets', name: 'Esri Streets', type: 'street' },
    { id: 'carto', name: 'Carto Dark (Tactical)', type: 'dark' },
    { id: 'carto_voyager', name: 'Carto Voyager', type: 'light' },
    { id: 'osm', name: 'OpenStreetMap', type: 'street' },
  ];

  return (
    <div className="fixed inset-0 z-[1300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Shield size={18} className="text-blue-500" />
            إعدادات النظام
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* User Info */}
          <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  {user?.user_metadata?.username?.[0]?.toUpperCase() || <User />}
               </div>
               <div>
                  <div className="text-white font-bold">{user?.user_metadata?.username || 'User'}</div>
                  <div className="text-xs text-slate-400">{user?.email}</div>
               </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
               <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">الرتبة: {userRole}</span>
               <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-900/50">نشط</span>
            </div>
          </div>

          {/* Map Provider */}
          <div>
            <label className="text-xs uppercase text-slate-500 font-bold mb-3 block flex items-center gap-2">
              <Map size={14} /> مصدر الخريطة
            </label>
            <div className="grid grid-cols-2 gap-2">
              {mapOptions.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setMapProvider(opt.id)}
                  className={`p-3 rounded-xl border text-right transition-all relative overflow-hidden group
                    ${mapProvider === opt.id 
                      ? 'bg-blue-600/20 border-blue-500 text-white' 
                      : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-slate-200'}
                  `}
                >
                  <div className="text-xs font-bold relative z-10">{opt.name}</div>
                  <div className="text-[10px] opacity-70 relative z-10 capitalize">{opt.type}</div>
                  {mapProvider === opt.id && (
                    <div className="absolute inset-0 bg-blue-600/10 z-0"></div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
             <p className="text-[10px] text-center text-slate-500">
                Gemini Tactical Map v1.0.0
             </p>
          </div>
        </div>
      </div>
    </div>
  );
};
