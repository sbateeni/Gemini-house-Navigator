
import React, { useState, useEffect } from 'react';
import { X, Send, User, MapPin } from 'lucide-react';
import { MapNote, UserProfile } from '../types';
import { db } from '../services/db';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetLocation: MapNote | null;
  onDispatch: (targetUserId: string, instructions: string) => Promise<void>;
  currentUserId: string;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  isOpen,
  onClose,
  targetLocation,
  onDispatch,
  currentUserId
}) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [instructions, setInstructions] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      db.getAllProfiles().then(profiles => {
        setUsers(profiles.filter(p => p.id !== currentUserId && p.role !== 'banned'));
      });
      setInstructions("");
      setSelectedUser("");
    }
  }, [isOpen, currentUserId]);

  const handleSubmit = async () => {
    if (!selectedUser || !targetLocation) return;
    setSending(true);
    await onDispatch(selectedUser, instructions);
    setSending(false);
    onClose();
  };

  if (!isOpen || !targetLocation) return null;

  return (
    <div className="fixed inset-0 z-[1400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md animate-in zoom-in-95">
        
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="bg-purple-900/30 p-1.5 rounded-lg">
                <Send className="text-purple-400 w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white">إصدار تكليف/مهمة</h2>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-900/20 rounded-lg flex items-center justify-center text-blue-400 shrink-0">
                <MapPin size={20} />
             </div>
             <div>
                <div className="text-xs text-slate-500 uppercase font-bold">الموقع المستهدف</div>
                <div className="text-white font-medium line-clamp-1">{targetLocation.locationName}</div>
             </div>
          </div>

          <div>
             <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">اختر الوحدة/العنصر</label>
             <div className="relative">
                <select 
                   value={selectedUser}
                   onChange={(e) => setSelectedUser(e.target.value)}
                   className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white appearance-none focus:border-purple-500 focus:outline-none transition-colors"
                >
                   <option value="">-- اختر المستخدم --</option>
                   {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.username} ({u.isApproved ? 'نشط' : 'قيد الانتظار'})
                      </option>
                   ))}
                </select>
                <User className="absolute left-3 top-3.5 text-slate-500 pointer-events-none" size={18} />
             </div>
          </div>

          <div>
             <label className="text-xs text-slate-400 font-bold uppercase mb-2 block">التعليمات (اختياري)</label>
             <textarea 
               value={instructions}
               onChange={(e) => setInstructions(e.target.value)}
               placeholder="مثال: توجه فوراً للدعم. الهدف متحرك."
               className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white focus:border-purple-500 focus:outline-none transition-colors h-24 resize-none"
             />
          </div>

          <button 
             onClick={handleSubmit}
             disabled={!selectedUser || sending}
             className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
             {sending ? "جاري الإرسال..." : "إرسال الأمر"}
             {!sending && <Send size={18} className="rotate-180" />}
          </button>
        </div>
      </div>
    </div>
  );
};
