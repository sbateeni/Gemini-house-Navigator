import React, { useState, useMemo } from 'react';
import { Search, Wifi, WifiOff, MapPin, Building2, CheckCircle2, Settings, Ban, Eye, X } from 'lucide-react';
import { UserProfile } from '../../types';

interface UsersPanelProps {
  users: UserProfile[];
  currentUserId: string;
  onlineUsers: Set<string>;
  onToggleApproval: (user: UserProfile) => void;
  onOpenEdit: (user: UserProfile) => void;
  onBanUser: (user: UserProfile) => void;
  onFilterByUser: (userId: string, userName: string) => void;
  canEditUsers?: boolean;
}

const ROLE_OPTIONS = [
  { value: '', label: 'كل الرتب' },
  { value: 'central_operations', label: 'العمليات المركزية' },
  { value: 'governorate_police', label: 'شرطة المحافظة' },
  { value: 'center', label: 'المركز' },
  { value: 'officer', label: 'ضابط' },
  { value: 'source', label: 'مصدر' },
  { value: 'banned', label: 'محظور' },
];

const CONNECTION_OPTIONS = [
  { value: '', label: 'الكل' },
  { value: 'online', label: 'متصل' },
  { value: 'offline', label: 'غير متصل' },
];

export const UsersPanel: React.FC<UsersPanelProps> = ({
  users, currentUserId, onlineUsers, onToggleApproval, onOpenEdit, onBanUser, onFilterByUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [connFilter, setConnFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return users.filter(u => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!u.username.toLowerCase().includes(q) && !(u.email || '').toLowerCase().includes(q)) return false;
      }
      if (roleFilter && u.role !== roleFilter) return false;
      if (connFilter === 'online' && !(u.id === currentUserId || onlineUsers.has(u.id))) return false;
      if (connFilter === 'offline' && (u.id === currentUserId || onlineUsers.has(u.id))) return false;
      return true;
    });
  }, [users, searchQuery, roleFilter, connFilter, currentUserId, onlineUsers]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(u => u.id)));
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const bulkBan = () => {
    filtered.filter(u => selectedIds.has(u.id)).forEach(u => onBanUser(u));
    clearSelection();
  };

  const bulkApprove = () => {
    filtered.filter(u => selectedIds.has(u.id)).forEach(u => onToggleApproval(u));
    clearSelection();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="px-4 py-2 bg-blue-900/20 border-b border-blue-800/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-blue-300 font-bold">تم تحديد {selectedIds.size}</span>
            <button onClick={clearSelection} className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1">
              <X size={10} /> إلغاء
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={bulkApprove} className="text-[10px] px-2.5 py-1 bg-green-600/20 text-green-400 rounded-lg border border-green-700/40 hover:bg-green-600/30 font-bold">
              موافقة جماعية
            </button>
            <button onClick={bulkBan} className="text-[10px] px-2.5 py-1 bg-red-600/20 text-red-400 rounded-lg border border-red-700/40 hover:bg-red-600/30 font-bold">
              حظر جماعي
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="px-4 py-3 border-b border-slate-800 space-y-2 bg-slate-900/50">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={12} className="absolute right-2.5 top-2 text-slate-500" />
            <input
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو البريد..."
              className="w-full bg-slate-950/50 border border-slate-700 rounded-lg py-1.5 pr-8 pl-2 text-xs text-white placeholder-slate-500 focus:border-blue-500/50 focus:outline-none transition-all text-right"
            />
          </div>
          <select
            value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
            className="bg-slate-950/50 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-blue-500/50 focus:outline-none"
          >
            {ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select
            value={connFilter} onChange={e => setConnFilter(e.target.value)}
            className="bg-slate-950/50 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:border-blue-500/50 focus:outline-none"
          >
            {CONNECTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div className="text-[10px] text-slate-600">
          {filtered.length} من {users.length} مستخدم
          {filtered.length !== users.length && (
            <button onClick={() => { setSearchQuery(''); setRoleFilter(''); setConnFilter(''); }} className="mr-2 text-blue-400 hover:text-blue-300">
              إعادة تعيين
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-right border-collapse">
          <thead className="bg-slate-900 sticky top-0 z-10 text-xs uppercase text-slate-500 font-semibold tracking-wider">
            <tr>
              <th className="p-3 w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size === filtered.length && filtered.length > 0}
                  onChange={toggleSelectAll}
                  className="accent-blue-500"
                />
              </th>
              <th className="p-3 border-b border-slate-800">المستخدم</th>
              <th className="p-3 border-b border-slate-800">الحالة</th>
              <th className="p-3 border-b border-slate-800">الرتبة</th>
              <th className="p-3 border-b border-slate-800">الموقع</th>
              <th className="p-3 border-b border-slate-800 text-left w-36">تحكم</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm">
            {filtered.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-500">لا يوجد مستخدمين</td></tr>
            ) : filtered.map(user => {
              const isMe = user.id === currentUserId;
              const isOnline = isMe || onlineUsers.has(user.id);
              const isBanned = user.role === 'banned';
              const isSelected = selectedIds.has(user.id);

              return (
                <tr key={user.id} className={`transition-colors ${!user.isApproved && !isBanned ? 'bg-yellow-900/10' : ''} ${isBanned ? 'bg-red-900/10 hover:bg-red-900/20' : isSelected ? 'bg-blue-900/10' : 'hover:bg-slate-800/30'}`}>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(user.id)}
                      className="accent-blue-500"
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-lg ${isBanned ? 'bg-red-900 text-red-200' : isMe ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                        {isBanned ? <Ban size={14} /> : user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white flex items-center gap-2 text-sm">
                          {user.username}
                          {isMe && <span className="text-[10px] bg-slate-700 px-1.5 rounded text-slate-300">أنت</span>}
                        </div>
                        <div className="text-slate-500 text-[11px]">{user.email || 'غير متوفر'}</div>
                        <button onClick={() => onFilterByUser(user.id, user.username)}
                          className="mt-1 text-[9px] flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors">
                          <Eye size={10} /> عرض النشاط
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium ${isOnline ? 'bg-green-900/20 text-green-400 border border-green-900/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                      {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                      {isOnline ? 'متصل' : 'غير متصل'}
                    </div>
                  </td>
                  <td className="p-3">
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold border w-fit ${
                       user.role === 'officer' ? 'bg-blue-900/20 text-blue-400 border-blue-900/50' :
                       ['central_operations', 'governorate_police', 'center'].includes(user.role) ? 'bg-purple-900/20 text-purple-400 border-purple-900/50' :
                       user.role === 'banned' ? 'bg-red-900/20 text-red-400 border-red-900/50' :
                       'bg-slate-800 text-slate-400 border-slate-700'}`}>
                       {user.role === 'central_operations' ? 'العمليات المركزية' :
                        user.role === 'governorate_police' ? 'شرطة المحافظة' :
                        user.role === 'center' ? 'المركز' :
                        user.role === 'officer' ? 'ضابط' :
                        user.role === 'source' ? 'مصدر' :
                        user.role === 'banned' ? 'محظور' : 'عنصر'}
                    </div>
                  </td>
                  <td className="p-3 text-slate-400 text-xs">
                    {user.role === 'central_operations' ? (
                      <span className="text-purple-400 font-bold text-[10px] bg-purple-900/20 px-2 py-1 rounded">جميع المحافظات</span>
                    ) : (
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1"><MapPin size={10} className="text-blue-500" /> {user.governorate || '---'}</div>
                        <div className="flex items-center gap-1"><Building2 size={10} className="text-yellow-500" /> {user.center || '---'}</div>
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-left">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => onToggleApproval(user)} disabled={isBanned}
                        title={user.isApproved ? 'إلغاء الموافقة' : 'قبول المستخدم'}
                        className={`p-1.5 rounded-lg border transition-all ${user.isApproved ? 'bg-green-900/20 text-green-400 border-green-900/50' : 'bg-yellow-900/20 text-yellow-500 border-yellow-900/50 animate-pulse'}`}>
                        <CheckCircle2 size={14} />
                      </button>
                      <button onClick={() => onOpenEdit(user)} disabled={isBanned}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700"
                        title="تعديل الصلاحيات">
                        <Settings size={14} />
                      </button>
                      <button onClick={() => onBanUser(user)} disabled={isMe}
                        className={`p-1.5 rounded-lg border transition-all ${isBanned ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-red-900/10 text-red-400 border-red-900/30'}`}>
                        <Ban size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
