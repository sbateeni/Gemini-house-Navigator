import React from 'react';
import { X, User, Map, Mail, Shield, Globe, Layers } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any; // Session user object
  userRole: 'admin' | 'user' | null;
  isSatellite: boolean;
  setIsSatellite: (isSat: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  userRole,
  isSatellite,
  setIsSatellite
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Account Section */}
          <section>
            <h3 className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-4">Account</h3>
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-4 border border-slate-700/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-blue-900/20">
                  {user?.user_metadata?.username?.charAt(0).toUpperCase() || <User />}
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{user?.user_metadata?.username || 'User'}</div>
                  <div className="text-slate-400 text-sm flex items-center gap-1.5">
                    <Shield size={12} className={userRole === 'admin' ? 'text-purple-400' : 'text-slate-500'} />
                    <span className="capitalize">{userRole || 'User'}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Mail size={16} className="text-slate-500" />
                  {user?.email}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <User size={16} className="text-slate-500" />
                  ID: <span className="font-mono text-slate-500 text-xs">{user?.id?.slice(0, 8)}...</span>
                </div>
              </div>
            </div>
          </section>

          {/* Preferences Section */}
          <section>
            <h3 className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-4">Map Preferences</h3>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setIsSatellite(false)}
                className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${!isSatellite ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
              >
                <Map size={24} />
                <span className="font-medium">Street View</span>
              </button>
              
              <button 
                onClick={() => setIsSatellite(true)}
                className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${isSatellite ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/20' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
              >
                <div className="relative">
                  <Globe size={24} />
                  <Layers size={14} className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-0.5" />
                </div>
                <span className="font-medium">Satellite</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};