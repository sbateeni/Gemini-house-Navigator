
import React, { useState } from 'react';
import { X, User, Map, Mail, Shield, Globe, Layers, Download, CheckCircle2, Trash2, Database, AlertTriangle, Mountain, Satellite, Eye } from 'lucide-react';
import { offlineMaps } from '../services/offlineMaps';
import { UserRole } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any; 
  userRole: UserRole | null;
  mapProvider: string;
  setMapProvider: (provider: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  user,
  userRole,
  mapProvider,
  setMapProvider
}) => {
  const [downloadProgress, setDownloadProgress] = useState<{current: number, total: number} | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const isAdmin = ['super_admin', 'governorate_admin', 'center_admin', 'admin'].includes(userRole || '');

  if (!isOpen) return null;

  const handleDownloadMap = async () => {
    if (!navigator.onLine) {
        alert("يجب أن تكون متصلاً بالإنترنت لتحميل الخرائط.");
        return;
    }

    if (!confirm("سيتم تحميل صور الأقمار الصناعية للمنطقة الظاهرة حالياً (Zoom 12-16). هذا قد يستهلك 50MB+. هل تريد المتابعة؟")) return;

    setIsDownloading(true);
    
    const event = new CustomEvent('download-offline-map', { 
        detail: { 
            callback: async (bounds: any) => {
                try {
                    await offlineMaps.downloadArea(bounds, 12, 16, (curr, total) => {
                        setDownloadProgress({ current: curr, total });
                    });
                    alert("تم تحميل الخرائط بنجاح!");
                } catch (e) {
                    alert("فشل التحميل.");
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
      if(confirm("هل أنت متأكد من حذف جميع الخرائط المحفوظة؟")) {
          await offlineMaps.clearCache();
          alert("تم تنظيف الذاكرة.");
      }
  };

  const providers = [
      { id: 'google', name: 'Google Hybrid', desc: 'أفضل دقة زوم (22x) - هجين', icon: Globe, iconColor: 'text-blue-400' },
      { id: 'esri_clarity', name: 'Esri Clarity (الأحدث)', desc: 'أحدث صور جوية (قديمة أقل، زوم 19x)', icon: Satellite, iconColor: 'text-purple-400' },
      { id: 'google_streets', name: 'Google Streets', desc: 'شوارع وتفاصيل مدنية (دقة عالية)', icon: Map, iconColor: 'text-blue-400' },
      { id: 'carto_voyager', name: 'Voyager HD', desc: 'خريطة شوارع ملونة وعالية الوضوح', icon: Map, iconColor: 'text-emerald-400' },
      { id: 'google_terrain', name: 'Google Terrain', desc: 'تضاريس وجبال (طبيعة)', icon: Mountain, iconColor: 'text-emerald-400' },
      { id: 'esri', name: 'Esri Satellite', desc: 'أقمار صناعية (قياسية)', icon: Globe, iconColor: 'text-cyan-400' },
      { id: 'carto', name: 'Tactical Dark', desc: 'نمط ليلي تكتيكي (منخفض التوهج)', icon: Layers, iconColor: 'text-slate-400' },
  ];

  // Safely extract string values to prevent object rendering errors
  const username = user?.user_metadata?.username || 'مستخدم';
  const email = user?.email || '';
  const initialChar = typeof username === 'string' && username.length > 0 ? username.charAt(0).toUpperCase() : 'U';

  return (
    <div className="fixed inset-0 z-[1300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
          <h2 className="text-xl font-bold text-white">الإعدادات</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Account Section */}
          <section>
            <h3 className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-4">الحساب</h3>
            <div className="bg-slate-800/50 rounded-xl p-4 space-y-4 border border-slate-700/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-blue-900/20">
                  {initialChar}
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{username}</div>
                  <div className="text-slate-400 text-sm flex items-center gap-1.5">
                    <Shield size={12} className={isAdmin ? 'text-purple-400' : 'text-slate-500'} />
                    <span className="capitalize">{isAdmin ? 'مدير النظام' : 'عنصر'}</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2 pt-2 border-t border-slate-700/50">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                  <Mail size={16} className="text-slate-500" />
                  {email}
                </div>
              </div>
            </div>
          </section>

          {/* Map Provider Section */}
          <section>
            <h3 className="text-xs uppercase text-slate-500 font-bold tracking-wider mb-4">مصدر الخرائط</h3>
            <div className="space-y-2 grid grid-cols-1 gap-2">
                {providers.map(p => (
                    <button
                        key={p.id}
                        onClick={() => setMapProvider(p.id)}
                        className={`w-full p-3 rounded-xl border flex items-center gap-4 transition-all ${mapProvider === p.id ? 'bg-blue-900/20 border-blue-500/50 shadow-lg relative z-10' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                    >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${mapProvider === p.id ? 'bg-blue-600 text-white' : `bg-slate-700 ${p.iconColor}`}`}>
                            <p.icon size={20} />
                        </div>
                        <div className="text-right flex-1 min-w-0">
                            <div className={`font-bold truncate ${mapProvider === p.id ? 'text-blue-400' : 'text-white'}`}>{p.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{p.desc}</div>
                        </div>
                        {mapProvider === p.id && <CheckCircle2 className="text-blue-500 shrink-0" size={20} />}
                    </button>
                ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 text-center">
                ملاحظة: "Esri Clarity" توفر صوراً أحدث للمباني الجديدة، بينما "Google Hybrid" توفر أفضل تقريب (Zoom).
            </p>
          </section>

          {/* Offline Maps Section */}
          <section>
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs uppercase text-slate-500 font-bold tracking-wider">الخرائط دون اتصال</h3>
                <span className="text-[10px] bg-green-900/30 text-green-400 border border-green-900/50 px-2 py-0.5 rounded">مفعل</span>
            </div>
            
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50 space-y-4">
                <p className="text-xs text-slate-400">
                    <Database size={14} className="inline ml-1 mb-0.5" />
                    يتم حفظ الملاحظات تلقائياً على جهازك. يمكنك العمل دون إنترنت وسيتم المزامنة عند عودة الاتصال.
                </p>

                <div className="border-t border-slate-700/50 pt-4">
                    <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                        <Download size={16} className="text-blue-400" />
                        تحميل منطقة العمليات
                    </h4>
                    <p className="text-xs text-slate-500 mb-3">
                        حفظ صور الأقمار الصناعية للمنطقة الحالية لاستخدامها في وضع عدم الاتصال.
                    </p>

                    {isDownloading ? (
                        <div className="bg-slate-900 rounded-lg p-3 border border-slate-700">
                            <div className="flex justify-between text-xs text-white mb-1">
                                <span>جاري التحميل...</span>
                                <span>{downloadProgress ? Math.round((downloadProgress.current / downloadProgress.total) * 100) : 0}%</span>
                            </div>
                            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                                <div 
                                    className="bg-blue-500 h-full transition-all duration-300"
                                    style={{ width: `${downloadProgress ? (downloadProgress.current / downloadProgress.total) * 100 : 0}%` }}
                                ></div>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-1 text-center">الرجاء عدم إغلاق النافذة</p>
                        </div>
                    ) : (
                        <button 
                            onClick={handleDownloadMap}
                            className="w-full bg-slate-700 hover:bg-slate-600 text-white py-2.5 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            <Download size={16} /> تحميل المنطقة الحالية
                        </button>
                    )}

                    <button 
                        onClick={handleClearCache}
                        className="w-full mt-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        <Trash2 size={14} /> حذف البيانات المحفوظة
                    </button>
                </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
