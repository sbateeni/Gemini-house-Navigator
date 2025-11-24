import React, { useEffect, useState } from 'react';
import { X, Shield, User, CheckCircle2, XCircle, Loader2, Wifi, WifiOff, Ban, Settings, ToggleLeft, ToggleRight, Building2, MapPin } from 'lucide-react';
import { db } from '../services/db';
import { UserProfile, UserPermissions, UserRole } from '../types';
import { supabase } from '../services/supabase';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserProfile: UserProfile | null;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, currentUserId, currentUserProfile }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserProfile | null>(null);

  // Filters for editing
  const [editGov, setEditGov] = useState("");
  const [editCenter, setEditCenter] = useState("");

  const isAdmin = ['super_admin', 'governorate_admin', 'center_admin', 'admin'].includes(currentUserProfile?.role || '');

  // Fetch Users
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

  // Subscribe to Presence (Online Status)
  useEffect(() => {
    if (!isOpen) return;

    const channel = supabase.channel('online-users');

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

    return () => {
      supabase.removeChannel(channel);
    };
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

  // Hierarchy Management
  const handleUpdateHierarchy = async () => {
     if (!selectedUserForPerms) return;
     
     const updates: Partial<UserProfile> = {};
     if (editGov) updates.governorate = editGov;
     if (editCenter) updates.center = editCenter;

     // Optimistic
     setProfiles(prev => prev.map(p => p.id === selectedUserForPerms.id ? { ...p, ...updates } : p));
     setSelectedUserForPerms(prev => prev ? { ...prev, ...updates } : null);

     try {
         await db.updateProfile(selectedUserForPerms.id, updates);
     } catch (e) {
         console.error("Failed update hierarchy", e);
         fetchUsers();
     }
  };

  const handleRoleChange = async (user: UserProfile, newRole: UserRole) => {
    if (confirm(`Change role of ${user.username} to ${newRole}?`)) {
        setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, role: newRole } : p));
        try {
            await db.updateProfile(user.id, { role: newRole });
        } catch (error) {
            console.error("Failed to update role", error);
            fetchUsers();
        }
    }
  };

  const handleBanUser = async (user: UserProfile) => {
    if (user.id === currentUserId) return;
    if (confirm(`Are you sure you want to BAN ${user.username}?`)) {
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

  const handlePermissionChange = async (key: keyof UserPermissions) => {
      if (!selectedUserForPerms) return;
      const currentPerms = selectedUserForPerms.permissions;
      const newPerms = { ...currentPerms, [key]: !currentPerms[key] };
      setSelectedUserForPerms({ ...selectedUserForPerms, permissions: newPerms });
      setProfiles(prev => prev.map(p => p.id === selectedUserForPerms.id ? { ...p, permissions: newPerms } : p));
      try {
          await db.updateProfile(selectedUserForPerms.id, { permissions: newPerms });
      } catch (error) {
          console.error("Failed to update permissions", error);
      }
  };

  const openUserModal = (user: UserProfile) => {
      setSelectedUserForPerms(user);
      setEditGov(user.governorate || "");
      setEditCenter(user.center || "");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 relative">
        
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

        <div className="flex-1 overflow-auto p-0">
           {loading ? (
             <div className="flex items-center justify-center h-64">
               <Loader2 className="animate-spin text-purple-500 w-8 h-8" />
             </div>
           ) : (
             <table className="w-full text-right border-collapse">
               <thead className="bg-slate-900 sticky top-0 z-10 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                 <tr>
                   <th className="p-4 border-b border-slate-800">المستخدم</th>
                   <th className="p-4 border-b border-slate-800">الحالة</th>
                   <th className="p-4 border-b border-slate-800">الرتبة</th>
                   <th className="p-4 border-b border-slate-800">الموقع (محافظة / مركز)</th>
                   <th className="p-4 border-b border-slate-800 text-left">تحكم</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800 text-sm">
                 {profiles.map(user => {
                   const isMe = user.id === currentUserId;
                   const isOnline = isMe || onlineUsers.has(user.id);
                   const isBanned = user.role === 'banned';

                   return (
                     <tr key={user.id} className={`transition-colors ${isBanned ? 'bg-red-900/10 hover:bg-red-900/20' : 'hover:bg-slate-800/30'}`}>
                       <td className="p-4">
                         <div className="flex items-center gap-3">
                           <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-lg ${isBanned ? 'bg-red-900 text-red-200' : isMe ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                             {isBanned ? <Ban size={18} /> : user.username.charAt(0).toUpperCase()}
                           </div>
                           <div>
                             <div className="font-medium text-white flex items-center gap-2">
                                {user.username}
                                {isMe && <span className="text-[10px] bg-slate-700 px-1.5 rounded text-slate-300">أنت</span>}
                             </div>
                             <div className="text-slate-500 text-xs">{user.email || 'No email'}</div>
                           </div>
                         </div>
                       </td>
                       <td className="p-4">
                         <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isOnline ? 'bg-green-900/20 text-green-400 border border-green-900/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                            {isOnline ? 'متصل' : 'غير متصل'}
                         </div>
                       </td>
                       <td className="p-4">
                         <div className={`px-3 py-1 rounded-lg text-xs font-bold border w-fit ${user.role.includes('admin') ? 'bg-purple-900/20 text-purple-400 border-purple-900/50' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                           {user.role === 'super_admin' ? 'قائد عام' : user.role === 'governorate_admin' ? 'مدير محافظة' : user.role === 'center_admin' ? 'مدير مركز' : 'عنصر'}
                         </div>
                       </td>
                       <td className="p-4 text-slate-400">
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-1">
                                <MapPin size={12} className="text-blue-500" />
                                <span>{user.governorate || 'غير محدد'}</span>
                             </div>
                             <div className="flex items-center gap-1">
                                <Building2 size={12} className="text-yellow-500" />
                                <span>{user.center || 'غير محدد'}</span>
                             </div>
                          </div>
                       </td>
                       <td className="p-4 text-left">
                         <div className="flex items-center justify-end gap-2">
                             <button 
                               onClick={() => toggleApproval(user)}
                               disabled={isBanned}
                               className={`p-2 rounded-lg border transition-all ${user.isApproved ? 'bg-green-900/20 text-green-400 border-green-900/50' : 'bg-yellow-900/20 text-yellow-500 border-yellow-900/50'}`}
                             >
                               {user.isApproved ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                             </button>

                             <button
                               onClick={() => openUserModal(user)}
                               disabled={isBanned}
                               className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700"
                               title="تعديل الصلاحيات والمكان"
                             >
                               <Settings size={16} />
                             </button>
                             <button 
                               onClick={() => handleBanUser(user)}
                               disabled={isMe}
                               className={`p-2 rounded-lg border transition-all ${isBanned ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-red-900/10 text-red-400 border-red-900/30'}`}
                             >
                               <Ban size={16} />
                             </button>
                         </div>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           )}
        </div>
      </div>

      {/* Permissions & Hierarchy Modal */}
      {selectedUserForPerms && (
        <div className="absolute inset-0 z-[1300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white">إدارة العنصر</h3>
                        <p className="text-sm text-slate-400">تعديل بيانات <span className="text-blue-400">{selectedUserForPerms.username}</span></p>
                    </div>
                    <button onClick={() => setSelectedUserForPerms(null)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                {/* Role & Hierarchy Section */}
                <div className="space-y-4 mb-6 pb-6 border-b border-slate-800">
                    <h4 className="text-xs uppercase text-slate-500 font-bold">الهيكلية والرتبة</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">الرتبة</label>
                            <select 
                                value={selectedUserForPerms.role}
                                onChange={(e) => handleRoleChange(selectedUserForPerms, e.target.value as UserRole)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm"
                                disabled={currentUserProfile?.role !== 'super_admin'} 
                            >
                                <option value="user">عنصر</option>
                                <option value="center_admin">مدير مركز</option>
                                <option value="governorate_admin">مدير محافظة</option>
                                <option value="super_admin">قيادة عامة</option>
                            </select>
                        </div>
                        
                        {(currentUserProfile?.role === 'super_admin') && (
                        <div>
                            <label className="text-xs text-slate-400 block mb-1">المحافظة</label>
                            <input 
                                type="text" 
                                value={editGov}
                                onChange={(e) => setEditGov(e.target.value)}
                                placeholder="مثال: رام الله"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm"
                            />
                        </div>
                        )}
                        
                        <div className="col-span-2">
                             <label className="text-xs text-slate-400 block mb-1">المركز / القسم</label>
                             <input 
                                type="text" 
                                value={editCenter}
                                onChange={(e) => setEditCenter(e.target.value)}
                                placeholder="مثال: مركز شرطة شقبا"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white text-sm"
                             />
                        </div>
                    </div>
                    
                    <button 
                        onClick={handleUpdateHierarchy}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-medium transition-colors"
                    >
                        حفظ التعديلات الهيكلية
                    </button>
                </div>

                {/* Permissions Section */}
                <div className="space-y-3">
                    <h4 className="text-xs uppercase text-slate-500 font-bold">الصلاحيات الفنية</h4>
                    
                    {['can_create', 'can_see_others', 'can_navigate'].map(perm => (
                        <div key={perm} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <span className="text-sm font-medium text-white">
                                {perm === 'can_create' ? 'إضافة ملاحظات' : perm === 'can_see_others' ? 'رؤية الزملاء' : 'استخدام الملاحة'}
                            </span>
                            <button onClick={() => handlePermissionChange(perm as keyof UserPermissions)}>
                                {selectedUserForPerms.permissions[perm as keyof UserPermissions] 
                                    ? <ToggleRight className="text-green-500 w-8 h-8 transition-colors" /> 
                                    : <ToggleLeft className="text-slate-600 w-8 h-8 transition-colors" />}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                    <button 
                        onClick={() => setSelectedUserForPerms(null)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
                    >
                        تم
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};