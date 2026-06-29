import React from 'react';
import { Users, Wifi, UserPlus, Activity, MapPin } from 'lucide-react';
import { UserProfile, MapUser } from '../../types';

interface CommandOverviewProps {
  profiles: UserProfile[];
  onlineUsersList: MapUser[];
  currentUserProfile: UserProfile | null;
}

const PALESTINE_GOVERNORATES = [
  'القدس', 'رام الله والبيرة', 'نابلس', 'الخليل', 'جنين',
  'طولكرم', 'قلقيلية', 'بيت لحم', 'سلفيت', 'أريحا والأغوار', 'طوباس',
];

const StatCard = ({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
}) => (
  <div className={`bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 flex items-start gap-3 ${color}`}>
    <div className={`p-2 rounded-lg bg-opacity-20 ${color.replace('text', 'bg').replace('border', '')}`}>
      <Icon size={18} className={color.split(' ')[0]} />
    </div>
    <div>
      <div className="text-2xl font-black text-white tracking-tight">{value}</div>
      <div className="text-xs text-slate-400 font-bold">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  </div>
);

export const CommandOverview: React.FC<CommandOverviewProps> = ({ profiles, onlineUsersList }) => {
  const onlineUserIds = new Set(onlineUsersList.map(u => u.id));
  const totalUsers = profiles.length;
  const onlineCount = onlineUsersList.length;
  const pendingCount = profiles.filter(p => !p.isApproved && p.role !== 'banned').length;
  const activeRoles = ['central_operations', 'governorate_police', 'center', 'officer'];
  const cmdCount = profiles.filter(p => activeRoles.includes(p.role) && onlineUserIds.has(p.id)).length;

  const govStats = PALESTINE_GOVERNORATES.map(gov => ({
    name: gov,
    total: profiles.filter(p => p.governorate === gov).length,
    online: profiles.filter(p => p.governorate === gov && onlineUserIds.has(p.id)).length,
  })).filter(g => g.total > 0);

  const recentOnline = [...onlineUsersList]
    .sort((a, b) => (b.lastUpdated || 0) - (a.lastUpdated || 0))
    .slice(0, 8);

  return (
    <div className="p-4 space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Users} label="إجمالي العناصر" value={totalUsers} sub={`${onlineCount} متصل`} color="text-blue-400 border-blue-900/30" />
        <StatCard icon={Wifi} label="متصل الآن" value={onlineCount} sub={`${((onlineCount / (totalUsers || 1)) * 100).toFixed(0)}% من العناصر`} color="text-green-400 border-green-900/30" />
        <StatCard icon={UserPlus} label="بإنتظار الموافقة" value={pendingCount} sub="طلبات انضمام جديدة" color={pendingCount > 0 ? 'text-yellow-400 border-yellow-900/30' : 'text-slate-500 border-slate-800'} />
        <StatCard icon={Activity} label="قيادة ميدانية" value={cmdCount} sub="قادة متصلون" color="text-purple-400 border-purple-900/30" />
      </div>

      {/* Two columns: Map + Online */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Governorate Map */}
        <div className="lg:col-span-3 bg-slate-900/80 border border-slate-700/50 rounded-xl p-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
            <MapPin size={12} /> توزيع القوات حسب المحافظة
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {govStats.map(gov => (
              <div key={gov.name} className="bg-slate-800/50 border border-slate-700/30 rounded-lg p-2.5 text-right">
                <div className="text-xs font-bold text-white truncate">{gov.name}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-500 flex items-center gap-0.5">
                    <Users size={8} /> {gov.total}
                  </span>
                  {gov.online > 0 && (
                    <span className="text-[10px] text-green-400 flex items-center gap-0.5">
                      <Wifi size={8} /> {gov.online}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500/60 rounded-full transition-all duration-500"
                    style={{ width: `${(gov.online / (gov.total || 1)) * 100}%` }}
                  />
                </div>
              </div>
            ))}
            {govStats.length === 0 && (
              <div className="col-span-full text-center py-6 text-slate-600 text-xs">لا توجد بيانات</div>
            )}
          </div>
        </div>

        {/* Online Now Panel */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-700/50 rounded-xl p-4">
          <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-1.5">
            <Wifi size={12} /> المتصلون الآن
          </h4>
          <div className="space-y-1.5">
            {recentOnline.length === 0 ? (
              <div className="text-center py-6 text-slate-600 text-xs">لا يوجد متصلين</div>
            ) : recentOnline.map(u => {
              const profile = profiles.find(p => p.id === u.id);
              return (
                <div key={u.id} className="flex items-center justify-between p-2 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-600/20 rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-green-400">{profile?.username?.charAt(0).toUpperCase() || '?'}</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{profile?.username || 'غير معروف'}</div>
                      <div className="text-[9px] text-slate-600">{profile?.governorate || '---'} {profile?.center ? `/ ${profile.center}` : ''}</div>
                    </div>
                  </div>
                  {profile && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${
                       profile.role === 'central_operations' || profile.role === 'governorate_police' || profile.role === 'center' ? 'bg-purple-900/30 text-purple-400 border-purple-900/50' :
                       profile.role === 'officer' ? 'bg-blue-900/30 text-blue-400 border-blue-900/50' :
                       'bg-slate-700/50 text-slate-400 border-slate-700'
                     }`}>
                       {profile.role === 'central_operations' ? 'العمليات المركزية' :
                        profile.role === 'governorate_police' ? 'شرطة المحافظة' :
                        profile.role === 'center' ? 'المركز' :
                        profile.role === 'officer' ? 'ضابط' :
                        profile.role === 'source' ? 'مصدر' : 'عنصر'}
                     </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
