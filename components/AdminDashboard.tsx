
import React, { useEffect, useState } from 'react';
import { X, Shield, Loader2 } from 'lucide-react';
import { db } from '../services/db';
import { UserProfile, UserPermissions, UserRole } from '../types';
import { supabase } from '../services/supabase';
import { UserTable } from './dashboard/UserTable';
import { EditUserModal } from './dashboard/EditUserModal';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserProfile: UserProfile | null;
}

const PALESTINE_GOVERNORATES = [
  'القدس', 'رام الله والبيرة', 'نابلس', 'الخليل', 'جنين',
  'طولكرم', 'قلقيلية', 'بيت لحم', 'سلفيت', 'أريحا والأغوار', 'طوباس',
  'شمال غزة', 'غزة', 'دير البلح', 'خان يونس', 'رفح'
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, currentUserId, currentUserProfile }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserProfile | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending'>('all');

  const fetchUsers = async () => {
    setLoading(true);
    const users = await db.getAllProfiles(currentUserProfile || undefined);
    setProfiles(users);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const channel = supabase.channel('online-users-dashboard');
    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const onlineIds = new Set<string>();
        Object.values(newState).forEach((presences: any) => {
          presences.forEach((p: any) => {
             if (p.user_id) onlineIds.add(p.user_id);
          });
        });
        setOnlineUsers(onlineIds);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOpen]);

  const toggleApproval = async (user: UserProfile) => {
    const newValue = !user.isApproved;
    setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, isApproved: newValue } : p));
    try {
      await db.updateProfile(user.id, { isApproved: newValue });
    } catch (error) {
      console.error("Failed to update approval", error);
      fetchUsers();
    }
  };

  const handleUpdateHierarchy = async (user: UserProfile, gov: string, center: string) => {
     const updates: Partial<UserProfile> = {};
     if (user.role !== 'super_admin') {
         updates.governorate = gov;
         if (user.role !== 'governorate_admin') {
             updates.center = center;
         } else {
             updates.center = null;
         }
     } else {
         updates.governorate = null;
         updates.center = null;
     }

     setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, ...updates } : p));
     setSelectedUserForPerms(prev => prev ? { ...prev, ...updates } : null);

     try {
         await db.updateProfile(user.id, updates);
     } catch (e) {
         console.error("Failed update hierarchy", e);
         fetchUsers();
     }
  };

  const handleRoleChange = async (user: UserProfile, newRole: UserRole) => {
      const updatedUser = { ...user, role: newRole };
      setProfiles(prev => prev.map(p => p.id === user.id ? updatedUser : p));
      setSelectedUserForPerms(updatedUser);
      
      try {
          await db.updateProfile(user.id, { role: newRole });
      } catch (error) {
          console.error("Failed to update role", error);
          fetchUsers();
      }
  };

  const handleBanUser = async (user: UserProfile) => {
    if (user.id === currentUserId) return;
    if (confirm(`هل أنت متأكد من حظر المستخدم ${user.username}؟`)) {
        const isBanned = user.role === 'banned';
        const newRole = isBanned ? 'user' : 'banned';
        setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, role: newRole, isApproved: isBanned } : p));
        try {
            await db.updateProfile(user.id, { role: newRole, isApproved: isBanned });
        } catch (error) {
            fetchUsers();
        }
    }
  };

  const handleUpdatePermissions = async (user: UserProfile, newPerms: UserPermissions) => {
      setSelectedUserForPerms({ ...user, permissions: newPerms });
      setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, permissions: newPerms } : p));
      try {
          await db.updateProfile(user.id, { permissions: newPerms });
      } catch (error) {
          console.error("Failed to update permissions", error);
      }
  };

  const getCentersForGov = (gov: string) => {
      const centers = new Set<string>();
      profiles.forEach(p => {
          if (p.governorate === gov && p.center) {
              centers.add(p.center);
          }
      });
      return Array.from(centers);
  };

  const pendingCount = profiles.filter(p => !p.isApproved && p.role !== 'banned').length;
  
  const filteredProfiles = profiles.filter(user => {
      if (filter === 'pending') return !user.isApproved && user.role !== 'banned';
      return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 relative">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-3">
             <div className="bg-purple-900/20 p-2.5 rounded-xl border border-purple-900/50">
                <Shield className="text-purple-400 w-6 h-6" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-white">مركز القيادة والسيطرة</h2>
               <p className="text-sm text-slate-400">
                   إدارة الهيكلية: {currentUserProfile?.governorate || 'القيادة العامة'} / {currentUserProfile?.center || 'الكل'}
               </p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Filters */}
        <div className="px-6 pt-4 pb-0 flex gap-4 border-b border-slate-800 bg-slate-900">
            <button 
                onClick={() => setFilter('all')}
                className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${filter === 'all' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
                جميع المستخدمين ({profiles.length})
            </button>
            <button 
                onClick={() => setFilter('pending')}
                className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${filter === 'pending' ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
                قيد الانتظار
                {pendingCount > 0 && (
                    <span className="bg-yellow-500 text-slate-900 text-[10px] px-1.5 py-0.5 rounded-full">{pendingCount}</span>
                )}
            </button>
        </div>

        <div className="flex-1 overflow-auto p-0">
           {loading ? (
             <div className="flex items-center justify-center h-64">
               <Loader2 className="animate-spin text-purple-500 w-8 h-8" />
             </div>
           ) : (
             <UserTable 
                users={filteredProfiles}
                currentUserId={currentUserId}
                onlineUsers={onlineUsers}
                onToggleApproval={toggleApproval}
                onOpenEdit={setSelectedUserForPerms}
                onBanUser={handleBanUser}
             />
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
