
import React from 'react';
import { UserProfile } from '../../types';
import { Wifi, WifiOff, MapPin, Building2, CheckCircle2, Settings, Ban } from 'lucide-react';

interface UserTableProps {
  users: UserProfile[];
  currentUserId: string;
  onlineUsers: Set<string>;
  onToggleApproval: (user: UserProfile) => void;
  onOpenEdit: (user: UserProfile) => void;
  onBanUser: (user: UserProfile) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  currentUserId,
  onlineUsers,
  onToggleApproval,
  onOpenEdit,
  onBanUser
}) => {
  return (
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
         {users.length === 0 ? (
             <tr>
                 <td colSpan={5} className="p-8 text-center text-slate-500">
                     لا يوجد مستخدمين لعرضهم
                 </td>
             </tr>
         ) : users.map(user => {
           const isMe = user.id === currentUserId;
           const isOnline = isMe || onlineUsers.has(user.id);
           const isBanned = user.role === 'banned';

           return (
             <tr key={user.id} className={`transition-colors ${!user.isApproved && !isBanned ? 'bg-yellow-900/10' : ''} ${isBanned ? 'bg-red-900/10 hover:bg-red-900/20' : 'hover:bg-slate-800/30'}`}>
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
                 <div className={`px-3 py-1 rounded-lg text-xs font-bold border w-fit 
                    ${user.role === 'officer' ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' : 
                      user.role && user.role.includes('admin') ? 'bg-purple-900/20 text-purple-400 border-purple-900/50' : 
                      'bg-slate-800 text-slate-400 border-slate-700'}`}>
                   {user.role === 'super_admin' ? 'قائد عام' : 
                    user.role === 'governorate_admin' ? 'مدير محافظة' : 
                    user.role === 'center_admin' ? 'مدير مركز' : 
                    user.role === 'officer' ? 'ضابط' :
                    user.role === 'admin' ? 'Admin' : 'عنصر'}
                 </div>
               </td>
               <td className="p-4 text-slate-400">
                  {user.role === 'super_admin' ? (
                      <span className="text-purple-400 font-bold text-xs bg-purple-900/20 px-2 py-1 rounded">كل الصلاحيات</span>
                  ) : (
                      <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-1">
                            <MapPin size={12} className="text-blue-500" />
                            <span>{user.governorate || '---'}</span>
                         </div>
                         <div className="flex items-center gap-1">
                            <Building2 size={12} className="text-yellow-500" />
                            <span>{user.center || '---'}</span>
                         </div>
                      </div>
                  )}
               </td>
               <td className="p-4 text-left">
                 <div className="flex items-center justify-end gap-2">
                     <button 
                       onClick={() => onToggleApproval(user)}
                       disabled={isBanned}
                       title={user.isApproved ? "إلغاء الموافقة" : "قبول المستخدم"}
                       className={`p-2 rounded-lg border transition-all ${user.isApproved ? 'bg-green-900/20 text-green-400 border-green-900/50' : 'bg-yellow-900/20 text-yellow-500 border-yellow-900/50 animate-pulse'}`}
                     >
                       {user.isApproved ? <CheckCircle2 size={16} /> : <CheckCircle2 size={16} />}
                     </button>

                     <button
                       onClick={() => onOpenEdit(user)}
                       disabled={isBanned}
                       className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700"
                       title="تعديل الصلاحيات والمكان"
                     >
                       <Settings size={16} />
                     </button>
                     <button 
                       onClick={() => onBanUser(user)}
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
  );
};
