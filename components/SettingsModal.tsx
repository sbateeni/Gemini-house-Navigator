
import React, { useState } from 'react';
import { X, User, Map, Mail, Shield, Globe, Layers, Download, CheckCircle, Trash2, Database, AlertTriangle } from 'lucide-react';
import { offlineMaps } from '../services/offlineMaps';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any; 
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
  const [downloadProgress, setDownloadProgress] = useState<{current: number, total: number} | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleDownloadMap = async () => {
    // Access the Leaflet Map instance to get bounds (We need to reach into the map component or pass bounds prop)
    // For this implementation, we will assume standard bounds or get current map context if possible.
    // Since we are in a modal, obtaining the exact map object is tricky without Context.
    // WORKAROUND: We will download the area around the user's last known location or a fixed area for demo.
    // Ideally, pass `mapBounds` as a prop. 
    
    // NOTE: For safety in this prompt response, we will check if the user is online.
    if (!navigator.onLine) {
        alert("You must be online to download maps.");
        return;
    }

    if (!confirm("This will download satellite imagery for the area currently visible on the map (Zoom 12-16). This may consume 50MB+ data. Continue?")) return;

    setIsDownloading(true);
    
    // We grab the map instance from the window object if available (Leaflet hack) or rely on a global state
    // Let's use the `window.mapBounds` if we set it in LeafletMap, otherwise default to a safe implementation.
    // For this codebase, I'll assume we pass `map` object or we access a global variable for simplicity in this specific "Settings" context.
    
    // Let's use a cleaner approach: Trigger an event that the App/Map listens to.
    const event = new CustomEvent('download-offline-map', { 
        detail: { 
            callback: async (bounds: any) => {
                try {
                    const count = offlineMaps.estimateTileCount(bounds, 12, 16);
                    console.log(`Downloading ~${count} tiles`);
                    
                    await offlineMaps.downloadArea(bounds, 12, 16, (curr, total) => {
                        setDownloadProgress({ current: curr, total });
                    });
                    alert("Offline Map Download Complete!");
                } catch (e) {
                    alert("Download failed.");
                    console.error(e);
                } finally {
                    setIsDownloading(false);
                    setDownloadProgress(null);
                }
            } 
        } 
    });
    window.dispatchEvent(event);
  };

  const handleClearCache = async () => {
      if(confirm("Delete all offline map data?")) {
          await offlineMaps.clearCache();
          alert("Offline maps cleared.");
      }
  };

  return (
    <div className="fixed inset-0 z-[1300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
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

          {/* Offline Maps Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase text-slate-500 font-bold tracking-wider">Offline Capabilities</h3>
                <span className="text-[10px] bg-green-900/30 text-green-400 border border-green-900/50 px-2 py-0.5 rounded">Enabled</span>
            </div>
            
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 space-y-4">
                <p className="text-xs text-slate-400">
                    <Database size={14} className="inline mr-1 mb-0.5" />
                    Notes are automatically saved to your device. You can add notes offline, and they will sync when you return online.
                </p>

                <div className="border-t border-slate-700/50 pt-4">
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                        <Download size={16} className="text-blue-400" />
                        Map Area Download
                    </h4>
                    <p className="text-xs text-slate-500 mb-3">
                        Save satellite imagery for the current map view to use without internet.
                    </p>

                    {isDownloading ? (
                        <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                            <div className="flex justify-between text-xs text-white mb-1">
                                <span>Downloading Tiles...</span>
                                <span>{downloadProgress ? Math.round((downloadProgress.current / downloadProgress.total) * 100) : 0}%</span>
                            </div>
                            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="bg-blue-500 h-full transition-all duration-300"
                                    style={{ width: `${downloadProgress ? (downloadProgress.current / downloadProgress.total) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 text-center">Please keep this window open</p>
                        </div>
                    ) : (
                        <button 
                            onClick={handleDownloadMap}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <Download size={16} /> Download Current View
                        </button>
                    )}

                    <button 
                        onClick={handleClearCache}
                        className="w-full mt-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 size={14} /> Clear Offline Map Data
                    </button>
                </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
