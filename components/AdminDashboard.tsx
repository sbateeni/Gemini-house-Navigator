import React, { useEffect, useState } from 'react';
import { X, Shield, User, CheckCircle2, XCircle, Loader2, Wifi, WifiOff } from 'lucide-react';
import { db } from '../services/db';
import { UserProfile } from '../types';
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
    // Optimistic update
    setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, isApproved: newValue } : p));
    
    try {
      await db.updateProfile(user.id, { isApproved: newValue });
    } catch (error) {
      console.error("Failed to update approval", error);
      fetchUsers(); // Revert on error
    }
  };

  const toggleRole = async (user: UserProfile) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (user.id === currentUserId) {
        alert("You cannot remove your own admin status.");
        return;
    }

    if (confirm(`Change role of ${user.username} to ${newRole.toUpperCase()}?`)) {
        // Optimistic update
        setProfiles(prev => prev.map(p => p.id === user.id ? { ...p, role: newRole } : p));
        try {
            await db.updateProfile(user.id, { role: newRole });
        } catch (error) {
            console.error("Failed to update role", error);
            fetchUsers();
        }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-3">
             <div className="bg-purple-900/20 p-2.5 rounded-xl border border-purple-900/50">
                <Shield className="text-purple-400 w-6 h-6" />
             </div>
             <div>
               <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>
               <p className="text-sm text-slate-400">Manage users and permissions</p>
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
                   <th className="p-4 border-b border-slate-800">Status</th>
                   <th className="p-4 border-b border-slate-800">Role</th>
                   <th className="p-4 border-b border-slate-800">Approval</th>
                   <th className="p-4 border-b border-slate-800 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-800 text-sm">
                 {profiles.map(user => {
                   const isOnline = onlineUsers.has(user.id);
                   const isMe = user.id === currentUserId;

                   return (
                     <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                       <td className="p-4">
                         <div className="flex items-center gap-3">
                           <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isMe ? 'bg-purple-600 text-white' : 'bg-slate-700 text-slate-300'}`}>
                             {user.username.charAt(0).toUpperCase()}
                           </div>
                           <div>
                             <div className="font-medium text-white flex items-center gap-2">
                                {user.username}
                                {isMe && <span className="text-[10px] bg-slate-700 px-1.5 rounded text-slate-300">YOU</span>}
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
                           className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all ${user.role === 'admin' ? 'bg-purple-900/20 text-purple-400 border-purple-900/50 hover:bg-purple-900/40' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                         >
                           {user.role.toUpperCase()}
                         </button>
                       </td>
                       <td className="p-4">
                          <button 
                            onClick={() => toggleApproval(user)}
                            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border transition-all ${user.isApproved ? 'bg-green-900/20 text-green-400 border-green-900/50 hover:bg-green-900/40' : 'bg-yellow-900/20 text-yellow-500 border-yellow-900/50 hover:bg-yellow-900/40'}`}
                          >
                            {user.isApproved ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            {user.isApproved ? 'Approved' : 'Pending'}
                          </button>
                       </td>
                       <td className="p-4 text-right">
                         <span className="text-slate-600 text-xs">ID: ...{user.id.slice(-4)}</span>
                       </td>
                     </tr>
                   );
                 })}
               </tbody>
             </table>
           )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-center text-xs text-slate-500">
           Presence updates automatically. Changes apply immediately.
        </div>
      </div>
    </div>
  );
};