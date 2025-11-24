
import React, { useEffect, useState } from 'react';
import { X, Shield, User, CheckCircle2, XCircle, Loader2, Wifi, WifiOff, Ban, Settings, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { db } from '../services/db';
import { UserProfile, UserPermissions } from '../types';
import { supabase } from '../services/supabase';

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ isOpen, onClose, currentUserId }) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [selectedUserForPerms, setSelectedUserForPerms] = useState<UserProfile | null>(null);

  // Fetch Users
  const fetchUsers = async () => {
    setLoading(true);
    const users = await db.getAllProfiles();
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
        
        // Extract user IDs from presence state
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

  const toggleRole = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (user.id === currentUserId) {
        alert("You cannot remove your own admin status.");
        return;
    }

    if (confirm(`Change role of ${user.username} to ${newRole.toUpperCase()}?`)) {
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
    
    if (confirm(`Are you sure you want to BAN ${user.username}? They will lose all access immediately.`)) {
        const isBanned = user.role === 'banned';
        const newRole = isBanned ? 'user' : 'banned';
        const newApproval = isBanned; // If unbanning, default to false approval or keep previous? Let's default to false for safety.
        
        setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, role: newRole, isApproved: newApproval } : p));
        
        try {
            await db.updateProfile(user.id, { role: newRole, isApproved: newApproval });
        } catch (error) {
            console.error("Failed to ban user", error);
            fetchUsers();
        }
    }
  };

  const handlePermissionChange = async (key: keyof UserPermissions) => {
      if (!selectedUserForPerms) return;
      
      const currentPerms = selectedUserForPerms.permissions;
      const newPerms = { ...currentPerms, [key]: !currentPerms[key] };
      
      // Optimistic UI update for the modal
      setSelectedUserForPerms({ ...selectedUserForPerms, permissions: newPerms });
      
      // Update main list too
      setProfiles(prev => prev.map(p => p.id === selectedUserForPerms.id ? { ...p, permissions: newPerms } : p));

      try {
          await db.updateProfile(selectedUserForPerms.id, { permissions: newPerms });
      } catch (error) {
          console.error("Failed to update permissions", error);
      }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      {/* Main Dashboard */}
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 relative">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-3">
             <div className="bg-purple-900/20 p-2.5 rounded-xl border border-purple-900/50">
                <Shield className="text-purple-400 w-6 h-6" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-white">Admin Command Center</h2>
               <p className="text-sm text-slate-400">Manage users, roles, and granular permissions</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-0">
           {loading ? (
             <div className="flex items-center justify-center h-64">
               <Loader2 className="animate-spin text-purple-500 w-8 h-8" />
             </div>
           ) : (
             <table className="w-full text-left border-collapse">
               <thead className="bg-slate-900 sticky top-0 z-10 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                 <tr>
                   <th className="p-4 border-b border-slate-800">User</th>
                   <th className="p-4 border-b border-slate-800">Connection</th>
                   <th className="p-4 border-b border-slate-800">Role</th>
                   <th className="p-4 border-b border-slate-800">Status</th>
                   <th className="p-4 border-b border-slate-800 text-right">Controls</th>
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
                                {isMe && <span className="text-[10px] bg-slate-700 px-1.5 rounded text-slate-300">YOU</span>}
                                {isBanned && <span className="text-[10px] bg-red-900/50 px-1.5 rounded text-red-400 border border-red-900">BANNED</span>}
                             </div>
                             <div className="text-slate-500 text-xs">{user.email || 'No email'}</div>
                           </div>
                         </div>
                       </td>
                       <td className="p-4">
                         <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isOnline ? 'bg-green-900/20 text-green-400 border border-green-900/30' : 'bg-slate-800 text-slate-500 border border-slate-700'}`}>
                            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                            {isOnline ? 'Online' : 'Offline'}
                         </div>
                       </td>
                       <td className="p-4">
                         <button 
                           onClick={() => toggleRole(user)}
                           disabled={isBanned}
                           className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${user.role === 'admin' ? 'bg-purple-900/20 text-purple-400 border-purple-900/50 hover:bg-purple-900/40' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                         >
                           {user.role === 'banned' ? 'SUSPENDED' : user.role.toUpperCase()}
                         </button>
                       </td>
                       <td className="p-4">
                          <button 
                            onClick={() => toggleApproval(user)}
                            disabled={isBanned}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${user.isApproved ? 'bg-green-900/20 text-green-400 border-green-900/50 hover:bg-green-900/40' : 'bg-yellow-900/20 text-yellow-500 border-yellow-900/50 hover:bg-yellow-900/40'}`}
                          >
                            {user.isApproved ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            {user.isApproved ? 'Approved' : 'Pending'}
                          </button>
                       </td>
                       <td className="p-4 text-right">
                         <div className="flex items-center justify-end gap-2">
                             <button
                               onClick={() => setSelectedUserForPerms(user)}
                               disabled={isBanned}
                               className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                               title="Manage Permissions"
                             >
                               <Settings size={16} />
                             </button>
                             <button 
                               onClick={() => handleBanUser(user)}
                               disabled={isMe}
                               className={`p-2 rounded-lg border transition-all disabled:opacity-50 disabled:cursor-not-allowed ${isBanned ? 'bg-slate-800 hover:bg-green-900/30 text-slate-400 hover:text-green-400 border-slate-700' : 'bg-red-900/10 hover:bg-red-900/30 text-red-400 border-red-900/30'}`}
                               title={isBanned ? "Unban User" : "Ban User"}
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

      {/* Permissions Modal Overlay */}
      {selectedUserForPerms && (
        <div className="absolute inset-0 z-[1300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-bold text-white">Permissions</h3>
                        <p className="text-sm text-slate-400">Managing access for <span className="text-blue-400">{selectedUserForPerms.username}</span></p>
                    </div>
                    <button onClick={() => setSelectedUserForPerms(null)} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="space-y-4">
                    {/* Permission Items */}
                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-900/20 rounded-lg text-blue-400">
                                <CheckCircle2 size={18} />
                            </div>
                            <div>
                                <div className="font-medium text-white">Create Notes</div>
                                <div className="text-xs text-slate-500">Can add new locations to map</div>
                            </div>
                        </div>
                        <button onClick={() => handlePermissionChange('can_create')}>
                            {selectedUserForPerms.permissions.can_create 
                                ? <ToggleRight className="text-green-500 w-10 h-10 transition-colors" /> 
                                : <ToggleLeft className="text-slate-600 w-10 h-10 transition-colors" />}
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-900/20 rounded-lg text-purple-400">
                                <User size={18} />
                            </div>
                            <div>
                                <div className="font-medium text-white">See Others</div>
                                <div className="text-xs text-slate-500">View other users on map</div>
                            </div>
                        </div>
                        <button onClick={() => handlePermissionChange('can_see_others')}>
                             {selectedUserForPerms.permissions.can_see_others 
                                ? <ToggleRight className="text-green-500 w-10 h-10 transition-colors" /> 
                                : <ToggleLeft className="text-slate-600 w-10 h-10 transition-colors" />}
                        </button>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-900/20 rounded-lg text-yellow-400">
                                <Settings size={18} />
                            </div>
                            <div>
                                <div className="font-medium text-white">Navigation</div>
                                <div className="text-xs text-slate-500">Use routing features</div>
                            </div>
                        </div>
                        <button onClick={() => handlePermissionChange('can_navigate')}>
                             {selectedUserForPerms.permissions.can_navigate 
                                ? <ToggleRight className="text-green-500 w-10 h-10 transition-colors" /> 
                                : <ToggleLeft className="text-slate-600 w-10 h-10 transition-colors" />}
                        </button>
                    </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800">
                    <button 
                        onClick={() => setSelectedUserForPerms(null)}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
