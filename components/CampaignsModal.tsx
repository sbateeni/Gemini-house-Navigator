
import React, { useState } from 'react';
import { X, Gamepad2, UserPlus, Trash2, CheckCircle, Clock } from 'lucide-react';

interface CampaignTarget {
    id: string;
    name: string;
    status: 'pending' | 'arrested';
    priority: 'high' | 'normal';
}

interface CampaignsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CampaignsModal: React.FC<CampaignsModalProps> = ({ isOpen, onClose }) => {
    const [targets, setTargets] = useState<CampaignTarget[]>([
        { id: '1', name: 'الهدف الأول - منطقة X', status: 'pending', priority: 'high' }
    ]);
    const [newName, setNewName] = useState("");

    if (!isOpen) return null;

    const addTarget = () => {
        if (!newName.trim()) return;
        setTargets(prev => [...prev, {
            id: crypto.randomUUID(),
            name: newName,
            status: 'pending',
            priority: 'normal'
        }]);
        setNewName("");
    };

    const toggleStatus = (id: string) => {
        setTargets(prev => prev.map(t => t.id === id ? { ...t, status: t.status === 'pending' ? 'arrested' : 'pending' } : t));
    };

    const deleteTarget = (id: string) => {
        setTargets(prev => prev.filter(t => t.id !== id));
    };

    return (
        <div className="fixed inset-0 z-[1600] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950">
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-900/20 p-2 rounded-lg border border-yellow-900/50">
                            <Gamepad2 className="text-yellow-500" size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-white">إدارة الحملات</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6">
                    {/* Add New */}
                    <div className="flex gap-2 mb-6">
                        <input 
                            type="text" 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="اسم الهدف الجديد..."
                            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-yellow-500 focus:outline-none"
                        />
                        <button 
                            onClick={addTarget}
                            className="bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold px-4 rounded-xl transition-colors"
                        >
                            <UserPlus size={20} />
                        </button>
                    </div>

                    {/* List */}
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                        {targets.map(target => (
                            <div key={target.id} className={`flex items-center justify-between p-4 rounded-xl border ${target.status === 'arrested' ? 'bg-green-900/10 border-green-900/30 opacity-60' : 'bg-slate-800 border-slate-700'}`}>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => toggleStatus(target.id)}>
                                        {target.status === 'arrested' ? <CheckCircle className="text-green-500" /> : <Clock className="text-slate-500 hover:text-yellow-500" />}
                                    </button>
                                    <div>
                                        <div className={`font-bold ${target.status === 'arrested' ? 'line-through text-slate-500' : 'text-white'}`}>{target.name}</div>
                                        <div className="text-[10px] text-slate-500">{target.status === 'pending' ? 'قيد المتابعة' : 'تم الاعتقال'}</div>
                                    </div>
                                </div>
                                <button onClick={() => deleteTarget(target.id)} className="text-slate-600 hover:text-red-500 p-2">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                        {targets.length === 0 && <p className="text-center text-slate-500 py-4">لا يوجد أهداف حالياً.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};
