
import React, { useState, useEffect } from 'react';
import { X, Shield, ToggleLeft, ToggleRight, ChevronDown } from 'lucide-react';
import { UserProfile, UserPermissions, UserRole } from '../../types';

interface EditUserModalProps {
  user: UserProfile | null;
  currentUserProfile: UserProfile | null;
  onClose: () => void;
  onUpdateRole: (user: UserProfile, role: UserRole) => void;
  onUpdateHierarchy: (user: UserProfile, gov: string, center: string) => void;
  onUpdatePermissions: (user: UserProfile, perms: UserPermissions) => void;
  availableCenters: string[];
  governoratesList: string[];
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  currentUserProfile,
  onClose,
  onUpdateRole,
  onUpdateHierarchy,
  onUpdatePermissions,
  availableCenters,
  governoratesList
}) => {
  const [editGov, setEditGov] = useState("");
  const [editCenter, setEditCenter] = useState("");

  useEffect(() => {
    if (user) {
        if (currentUserProfile?.role === 'governorate_admin') {
            setEditGov(currentUserProfile.governorate || "");
        } else if (currentUserProfile?.role === 'center_admin') {
            setEditGov(currentUserProfile.governorate || "");
            setEditCenter(currentUserProfile.center || "");
        } else {
            setEditGov(user.governorate || "");
        }
        setEditCenter(user.center || "");
    }
  }, [user, currentUserProfile]);

  if (!user) return null;

  const handlePermChange = (key: keyof UserPermissions) => {
    const newPerms = { ...user.permissions, [key]: !user.permissions[key] };
    onUpdatePermissions(user, newPerms);
  };

  const permLabels: Record<keyof UserPermissions, string> = {
      can_create: 'إضافة ملاحظات',
      can_see_others: 'رؤية الزملاء',
      can_navigate: 'استخدام الملاحة',
      can_edit_users: 'إدارة المستخدمين',
      can_dispatch: 'إرسال التوجيهات',
      can_view_logs: 'رؤية السجلات',
      can_manage_content: 'تعديل وإدارة المحتوى (المعلومات المدخلة)'
  };

  return (
    <div className="absolute inset-0 z-[1300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-lg font-bold text-white">إدارة العنصر</h3>
                    <p className="text-sm text-slate-400">تعديل بيانات <span className="text-blue-400">{user.username}</span></p>
                </div>
                <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>

            {/* Role & Hierarchy Section */}
            <div className="space-y-4 mb-6 pb-6 border-b border-slate-800">
                <h4 className="text-xs uppercase text-slate-500 font-bold">الهيكلية والرتبة</h4>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-xs text-slate-400 block mb-1">الرتبة</label>
                        <select 
                            value={user.role}
                            onChange={(e) => onUpdateRole(user, e.target.value as UserRole)}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-purple-500 focus:outline-none"
                            disabled={currentUserProfile?.role !== 'super_admin' && currentUserProfile?.role !== 'admin' && currentUserProfile?.role !== 'governorate_admin' && currentUserProfile?.role !== 'center_admin'} 
                        >
                            <option value="user">عنصر</option>
                            <option value="officer">ضابط</option>
                            <option value="judicial">ضابط قضائية (حملات)</option>
                            <option value="center_admin">مدير مركز</option>
                            {(currentUserProfile?.role === 'super_admin' || currentUserProfile?.role === 'admin') && (
                                <>
                                    <option value="governorate_admin">مدير محافظة</option>
                                    <option value="super_admin">قيادة عامة</option>
                                </>
                            )}
                        </select>
                    </div>
                    
                    {user.role !== 'super_admin' ? (
                        <>
                            <div>
                                <label className="text-xs text-slate-400 block mb-1">المحافظة</label>
                                <div className="relative">
                                    <select 
                                        value={editGov}
                                        onChange={(e) => {
                                            setEditGov(e.target.value);
                                            setEditCenter(""); 
                                        }}
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm appearance-none focus:border-purple-500 focus:outline-none disabled:opacity-50"
                                        disabled={currentUserProfile?.role === 'governorate_admin' || currentUserProfile?.role === 'center_admin'}
                                    >
                                        <option value="">-- اختر المحافظة --</option>
                                        {governoratesList.map(gov => (
                                            <option key={gov} value={gov}>{gov}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute left-3 top-3.5 text-slate-500 pointer-events-none" size={16} />
                                </div>
                            </div>
                            
                            {user.role !== 'governorate_admin' && (
                                <div>
                                     <label className="text-xs text-slate-400 block mb-1">المركز / القسم</label>
                                     <input 
                                        list="centers-list"
                                        type="text" 
                                        value={editCenter}
                                        onChange={(e) => setEditCenter(e.target.value)}
                                        placeholder="اكتب اسم المركز..."
                                        className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white text-sm focus:border-purple-500 focus:outline-none disabled:opacity-50"
                                        disabled={currentUserProfile?.role === 'center_admin'}
                                     />
                                     <datalist id="centers-list">
                                         {availableCenters.map(c => (
                                             <option key={c} value={c} />
                                         ))}
                                     </datalist>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="col-span-2 bg-purple-900/20 border border-purple-900/50 rounded-lg p-3 text-center">
                            <span className="text-purple-400 text-sm font-bold flex items-center justify-center gap-2">
                                <Shield size={16} /> يملك كافة الصلاحيات على جميع المحافظات
                            </span>
                        </div>
                    )}
                </div>
                
                <button 
                    onClick={() => onUpdateHierarchy(user, editGov, editCenter)}
                    className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-bold transition-colors mt-2"
                >
                    حفظ التعديلات الهيكلية
                </button>
            </div>

            {/* Permissions Section */}
            {user.role !== 'super_admin' && (
                <div className="space-y-3">
                    <h4 className="text-xs uppercase text-slate-500 font-bold">الصلاحيات الفنية</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {(Object.keys(permLabels) as Array<keyof UserPermissions>).map(perm => (
                            <div key={perm} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                <span className="text-sm font-medium text-white">
                                    {permLabels[perm]}
                                </span>
                                <button onClick={() => handlePermChange(perm)}>
                                    {user.permissions[perm] 
                                        ? <ToggleRight className="text-green-500 w-8 h-8 transition-colors" /> 
                                        : <ToggleLeft className="text-slate-600 w-8 h-8 transition-colors" />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-800">
                <button 
                    onClick={onClose}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-blue-900/20"
                >
                    تم
                </button>
            </div>
        </div>
    </div>
  );
};
