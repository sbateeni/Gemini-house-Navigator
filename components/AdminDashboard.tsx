
import React, { useEffect, useState } from 'react';
import { X, Shield, Loader2, UserPlus, Users, KeyRound, Copy, Check, Trash2, StopCircle, Clock, Siren } from 'lucide-react';
import { db } from '../services/db';
import { UserProfile, UserPermissions, UserRole, AccessCode } from '../types';
import { supabase } from '../services/supabase';
import { UserTable } from './dashboard/UserTable';
import { EditUserModal } from './dashboard/EditUserModal';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserProfile: UserProfile | null;
  onFilterByUser: (userId: string, userName: string) => void;
}

const PALESTINE_GOVERNORATES = [
  'القدس', 'رام الله والبيرة', 'نابلس', 'الخليل', 'جنين',
  'طولكرم', 'قلقيلية', 'بيت لحم', 'سلفيت', 'أريحا والأغوار', 'طوباس',
  'شمال غزة', 'غزة', 'دير البلح', 'خان يونس', 'رفح'
];

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
    isOpen, onClose, currentUserId, currentUserProfile, onFilterByUser 
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserProfile | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'sources'>('all');
  const [generatingCode, setGeneratingCode] = useState(false);
  const [newCodeLabel, setNewCodeLabel] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const isOfficerOrAbove = ['super_admin', 'governorate_admin', 'center_admin', 'admin', 'officer', 'judiciary'].includes(currentUserProfile?.role || '');

  const fetchData = async () => {
    setLoading(true);
    const users = await db.getAllProfiles(currentUserProfile || undefined);
    setProfiles(users);
    
    if (isOfficerOrAbove) {
        const codes = await db.getMyAccessCodes();
        setAccessCodes(codes);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
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
      fetchData();
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
         fetchData();
     }
  };

  const handleRoleChange = async (user: UserProfile, newRole: UserRole) => {
      const updatedUser = { ...user, role: newRole };
      setProfiles(prev => prev.map(p => p.id === user.id ? updatedUser : p));
      setSelectedUserForPerms(updatedUser);
      try {
          await db.updateProfile(user.id, { role: newRole });
      } catch (error) {
          fetchData();
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
            fetchData();
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

  // --- SOURCE CODE LOGIC ---
  const handleGenerateCode = async () => {
      if (!newCodeLabel.trim()) return;
      setGeneratingCode(true);
      try {
          const newCode = await db.createAccessCode(newCodeLabel);
          setAccessCodes([newCode, ...accessCodes]);
          setNewCodeLabel("");
      } catch (e) {
          alert("فشل إنشاء الكود");
      } finally {
          setGeneratingCode(false);
      }
  };

  const handleRevokeCode = async (codeStr: string) => {
      if (confirm("هل تريد إيقاف جلسة المصدر فوراً؟ (تسجيل خروج إجباري)")) {
          try {
              await db.revokeAccessCode(codeStr);
              setAccessCodes(prev => prev.map(c => c.code === codeStr ? { ...c, is_active: false } : c));
          } catch (e) {
              alert("فشل الإيقاف");
          }
      }
  };
  
  const handleExtendCode = async (codeStr: string) => {
      if (confirm("تمديد الجلسة لمدة 30 دقيقة إضافية؟")) {
          try {
              await db.extendAccessCode(codeStr, 30);
              // Refresh full list to get new expiry
              const codes = await db.getMyAccessCodes();
              setAccessCodes(codes);
          } catch (e) {
              alert("فشل التمديد");
          }
      }
  };

  const handleDeleteCode = async (codeStr: string) => {
      if (confirm("حذف المصدر وسجلاته نهائياً من القائمة؟")) {
          try {
              await db.deleteAccessCode(codeStr);
              setAccessCodes(prev => prev.filter(c => c.code !== codeStr));
          } catch (e) {
              alert("فشل الحذف");
          }
      }
  };

  const copyCode = (code: string) => {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
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
  const activeCodesCount = accessCodes.filter(c => c.is_active && c.expires_at > Date.now()).length;

  const filteredProfiles = profiles.filter(user => {
      if (filter === 'pending') return !user.isApproved && user.role !== 'banned';
      return true;
  });
  
  const handleStartCampaign = () => {
      alert("خاصية حملات الاعتقال ستكون متاحة في التحديث القادم بعد تهيئة قاعدة البيانات.");
  };

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
          
          <div className="flex items-center gap-3">
            {/* Campaign Trigger Button (Manager+) */}
            {['super_admin', 'admin', 'governorate_admin'].includes(currentUserProfile?.role || '') && (
                <button 
                    onClick={handleStartCampaign}
                    className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-red-900/20 animate-pulse"
                >
                    <Siren size={16} />
                    حملة اعتقالات
                </button>
            )}
            
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={24} />
            </button>
          </div>
        </div>

        {/* Filters / Tabs */}
        <div className="px-6 pt-4 pb-0 flex gap-6 border-b border-slate-800 bg-slate-900">
            <button 
                onClick={() => setFilter('all')}
                className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${filter === 'all' ? 'border-purple-500 text-purple-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
                <Users size={16} />
                جميع المستخدمين
            </button>
            <button 
                onClick={() => setFilter('pending')}
                className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${filter === 'pending' ? 'border-yellow-500 text-yellow-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
            >
                <UserPlus size={16} />
                طلبات الانضمام
                {pendingCount > 0 && (
                    <span className="bg-yellow-500 text-slate-900 text-[10px] px-2 py-0.5 rounded-full animate-pulse">{pendingCount}</span>
                )}
            </button>
            
            {isOfficerOrAbove && (
                <button 
                    onClick={() => setFilter('sources')}
                    className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${filter === 'sources' ? 'border-green-500 text-green-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
                >
                    <KeyRound size={16} />
                    المصادر المؤقتة
                    {activeCodesCount > 0 && (
                        <span className="bg-green-500 text-slate-900 text-[10px] px-2 py-0.5 rounded-full animate-pulse">{activeCodesCount}</span>
                    )}
                </button>
            )}
        </div>

        <div className="flex-1 overflow-auto p-0 bg-slate-900/50">
           {loading ? (
             <div className="flex items-center justify-center h-64">
               <Loader2 className="animate-spin text-purple-500 w-8 h-8" />
             </div>
           ) : filter === 'sources' ? (
               <div className="p-6 space-y-6">
                   {/* Generator */}
                   <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex gap-4 items-end">
                       <div className="flex-1">
                           <label className="text-xs text-slate-400 mb-1 block">اسم المصدر / العملية (اختياري)</label>
                           <input 
                              type="text" 
                              value={newCodeLabel}
                              onChange={e => setNewCodeLabel(e.target.value)}
                              placeholder="مثال: مصدر منطقة X"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-sm text-white focus:border-green-500 focus:outline-none"
                           />
                       </div>
                       <button 
                           onClick={handleGenerateCode}
                           disabled={generatingCode || !newCodeLabel.trim()}
                           className="bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-6 rounded-lg text-sm flex items-center gap-2 disabled:opacity-50"
                       >
                           {generatingCode ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
                           توليد كود (30 دقيقة)
                       </button>
                   </div>

                   {/* Codes List */}
                   <div className="space-y-3">
                       {accessCodes.length === 0 && <p className="text-center text-slate-500 py-8">لم تقم بإنشاء أي أكواد مصادر بعد.</p>}
                       {accessCodes.map(ac => {
                           const isExpired = Date.now() > ac.expires_at;
                           const timeLeft = Math.max(0, Math.ceil((ac.expires_at - Date.now()) / 60000));
                           const isActive = ac.is_active && !isExpired;
                           
                           return (
                               <div key={ac.code} className={`flex items-center justify-between p-4 rounded-xl border ${isActive ? 'bg-slate-800 border-slate-700' : 'bg-slate-900 border-slate-800 opacity-60'}`}>
                                   <div className="flex items-center gap-4">
                                       <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-lg bg-slate-950 border ${isActive ? 'border-green-500/30 text-green-400' : 'border-red-900/30 text-red-500'}`}>
                                           {isActive ? <KeyRound size={20} /> : <X size={20} />}
                                       </div>
                                       <div>
                                           <div className="text-white font-bold">{ac.label || 'بدون اسم'}</div>
                                           <div className="text-xs font-mono text-slate-400 mt-1 flex items-center gap-2">
                                               {ac.code.match(/.{1,4}/g)?.join(' ')}
                                               <button onClick={() => copyCode(ac.code)} className="hover:text-white">
                                                   {copiedCode === ac.code ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                               </button>
                                           </div>
                                       </div>
                                   </div>

                                   <div className="flex items-center gap-6">
                                       <div className="text-right">
                                           <div className={`text-xs font-bold ${isActive ? 'text-green-400' : 'text-red-500'}`}>
                                               {!ac.is_active ? 'تم الإيقاف' : isExpired ? 'منتهي' : 'نشط'}
                                           </div>
                                           {isActive && (
                                               <div className="text-[10px] text-slate-500">متبقي {timeLeft} دقيقة</div>
                                           )}
                                       </div>
                                       
                                       <div className="flex items-center gap-2">
                                           {/* Action Buttons */}
                                           
                                           {/* Extend Button */}
                                           <button 
                                                onClick={() => handleExtendCode(ac.code)}
                                                className="p-2 bg-blue-900/20 hover:bg-blue-900/40 text-blue-400 rounded-lg border border-blue-900/50 transition-colors"
                                                title="تمديد 30 دقيقة"
                                           >
                                                <Clock size={16} />
                                           </button>

                                           {/* Force Logout / Stop Button (Only if Active) */}
                                           {isActive && (
                                               <button 
                                                   onClick={() => handleRevokeCode(ac.code)}
                                                   className="p-2 bg-orange-900/20 hover:bg-orange-900/40 text-orange-500 rounded-lg border border-orange-900/50 transition-colors"
                                                   title="تسجيل خروج إجباري (إيقاف)"
                                               >
                                                   <StopCircle size={16} />
                                               </button>
                                           )}

                                           {/* Delete Button (Always Visible) */}
                                           <button 
                                               onClick={() => handleDeleteCode(ac.code)}
                                               className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-lg border border-red-900/50 transition-colors"
                                               title="حذف نهائي من القائمة"
                                           >
                                               <Trash2 size={16} />
                                           </button>
                                       </div>
                                   </div>
                               </div>
                           );
                       })}
                   </div>
               </div>
           ) : (
             <UserTable 
                users={filteredProfiles}
                currentUserId={currentUserId}
                onlineUsers={onlineUsers}
                onToggleApproval={toggleApproval}
                onOpenEdit={setSelectedUserForPerms}
                onBanUser={handleBanUser}
                onFilterByUser={onFilterByUser}
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
