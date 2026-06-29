import React, { useCallback, useEffect, useState } from 'react';
import { X, Shield, Loader2, Users, KeyRound, LayoutDashboard, Bell } from 'lucide-react';
import { db } from '../../services/db';
import { UserProfile, UserPermissions, UserRole, MapUser } from '../../types';
import { isOfficerOrAbove } from '../../constants/roles';
import { EditUserModal } from './EditUserModal';
import { SourceCodeManager } from './SourceCodeManager';
import { CommandOverview } from './CommandOverview';
import { UsersPanel } from './UsersPanel';
import { AlertsPanel } from './AlertsPanel';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserEmail?: string;
  currentUserProfile: UserProfile | null;
  onFilterByUser: (userId: string, userName: string) => void;
  canEditUsers?: boolean;
  onlineUsersList: MapUser[];
}

const PALESTINE_GOVERNORATES = [
  'القدس', 'رام الله والبيرة', 'نابلس', 'الخليل', 'جنين',
  'طولكرم', 'قلقيلية', 'بيت لحم', 'سلفيت', 'أريحا والأغوار', 'طوباس',
];

type DashboardTab = 'overview' | 'users' | 'sources' | 'alerts';

const TABS: { id: DashboardTab; icon: React.ElementType; label: string }[] = [
  { id: 'overview', icon: LayoutDashboard, label: 'لوحة القيادة' },
  { id: 'users', icon: Users, label: 'المستخدمون' },
  { id: 'sources', icon: KeyRound, label: 'المصادر' },
  { id: 'alerts', icon: Bell, label: 'التنبيهات' },
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
    isOpen, onClose, currentUserId, currentUserEmail, currentUserProfile, onFilterByUser, onlineUsersList, canEditUsers
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');

  const onlineUserIds = new Set(onlineUsersList.map(u => u.id));

  const isUserOfficerOrAbove = isOfficerOrAbove(currentUserProfile?.role);
  const isSuperAdmin = currentUserProfile?.role === 'central_operations';

  const fetchData = useCallback(async () => {
    setLoading(true);
    const users = await db.getAllProfiles();
    setProfiles(users);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      void Promise.resolve().then(fetchData);
    }
  }, [isOpen, fetchData]);

  const toggleApproval = async (user: UserProfile) => {
    const newValue = !user.isApproved;
    setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, isApproved: newValue } : p));
    try { await db.updateProfile(user.id, { is_approved: newValue }); }
    catch { fetchData(); }
  };

  const handleUpdateHierarchy = async (user: UserProfile, gov: string, center: string) => {
     const updates: Record<string, string | null> = {};
     updates.governorate = gov || null;
     if (user.role !== 'governorate_police') updates.center = center || null;
     else updates.center = null;
     setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, ...updates } as UserProfile : p));
     setSelectedUserForPerms(prev => prev ? { ...prev, ...updates } as UserProfile : null);
     try { await db.updateProfile(user.id, updates); }
     catch (e) { console.error('فشل حفظ المحافظة:', e); fetchData(); }
  };

  const handleRoleChange = async (user: UserProfile, newRole: UserRole) => {
      const updatedUser = { ...user, role: newRole };
      setProfiles(prev => prev.map(p => p.id === user.id ? updatedUser : p));
      setSelectedUserForPerms(updatedUser);
      try { await db.updateProfile(user.id, { role: newRole }); }
      catch { fetchData(); }
  };

  const handleBanUser = async (user: UserProfile) => {
    if (user.id === currentUserId) return;
    if (confirm(`هل أنت متأكد من حظر المستخدم ${user.username}؟`)) {
        const isBanned = user.role === 'banned';
        const newRole = isBanned ? 'source' : 'banned';
        setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, role: newRole as UserRole, isApproved: isBanned } : p));
        try { await db.updateProfile(user.id, { role: newRole, is_approved: isBanned }); }
        catch { fetchData(); }
    }
  };

  const handleUpdatePermissions = async (user: UserProfile, newPerms: UserPermissions) => {
      setSelectedUserForPerms({ ...user, permissions: newPerms });
      setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, permissions: newPerms } : p));
      try { await db.updateProfile(user.id, { permissions: newPerms }); }
      catch {}
  };

  const getCentersForGov = (gov: string) => {
      const centers = new Set<string>();
      profiles.forEach(p => { if (p.governorate === gov && p.center) centers.add(p.center); });
      return Array.from(centers);
  };

  const pendingCount = profiles.filter(p => !p.isApproved && p.role !== 'banned').length;

  const filteredProfiles = profiles.filter(() => {
      if (activeTab === 'users') {
        const ftab = document.querySelector('[data-filter="users"]');
        if (ftab) return true;
      }
      return true;
  });
  const normalizedProfiles = filteredProfiles.map((profile) =>
    profile.id === currentUserId && !profile.email && currentUserEmail
      ? { ...profile, email: currentUserEmail }
      : profile
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[3000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 relative">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
          <div className="flex items-center gap-3">
             <div className="bg-purple-900/20 p-2 sm:p-2.5 rounded-xl border border-purple-900/50">
                <Shield className="text-purple-400 w-5 h-5 sm:w-6 sm:h-6" />
             </div>
             <div>
               <h2 className="text-lg sm:text-xl font-bold text-white">مركز القيادة والسيطرة</h2>
               <p className="text-xs sm:text-sm text-slate-400">
                  {currentUserProfile?.governorate || 'القيادة العامة'} / {currentUserProfile?.center || 'الكل'}
               </p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900 overflow-x-auto shrink-0">
          {TABS.filter(t => t.id !== 'sources' || isUserOfficerOrAbove).map(({ id, icon: Icon, label }) => {
            const count = id === 'users' ? pendingCount : 0;
            return (
              <button key={id} onClick={() => setActiveTab(id)}
                className={`flex items-center gap-1.5 px-4 sm:px-5 py-3 text-xs sm:text-sm font-bold border-b-2 transition-colors shrink-0 ${
                  activeTab === id
                    ? 'border-purple-500 text-purple-400 bg-purple-900/10'
                    : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                }`}>
                <Icon size={14} />
                <span>{label}</span>
                {count > 0 && (
                  <span className="bg-yellow-500 text-slate-900 text-[9px] px-1.5 py-0.5 rounded-full animate-pulse font-mono">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-900/50">
          {loading && activeTab !== 'overview' ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-purple-500 w-8 h-8" />
            </div>
          ) : activeTab === 'overview' ? (
            <CommandOverview profiles={profiles} onlineUsersList={onlineUsersList} currentUserProfile={currentUserProfile} />
          ) : activeTab === 'users' ? (
            <UsersPanel
              users={normalizedProfiles}
              currentUserId={currentUserId}
              onlineUsers={onlineUserIds}
              onToggleApproval={toggleApproval}
              onOpenEdit={setSelectedUserForPerms}
              onBanUser={handleBanUser}
              onFilterByUser={onFilterByUser}
              canEditUsers={canEditUsers}
            />
          ) : activeTab === 'sources' ? (
            <SourceCodeManager isSuperAdmin={isSuperAdmin} currentUserId={currentUserId} profiles={profiles} onDataChanged={fetchData} />
          ) : (
            <AlertsPanel />
          )}
        </div>
      </div>

      <EditUserModal
        user={selectedUserForPerms}
        currentUserProfile={currentUserProfile}
        onClose={() => setSelectedUserForPerms(null)}
        onUpdateRole={handleRoleChange}
        onUpdateHierarchy={handleUpdateHierarchy}
        onUpdatePermissions={handleUpdatePermissions}
        availableCenters={selectedUserForPerms?.governorate ? getCentersForGov(selectedUserForPerms.governorate) : []}
        governoratesList={PALESTINE_GOVERNORATES}
      />
    </div>
  );
};
