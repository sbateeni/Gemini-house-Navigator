
import React, { useState } from 'react';
import { X, Gamepad2, Users, MapPin, Eye, Search, CheckCircle, Shield } from 'lucide-react';
import { MapUser, MapNote, UserProfile } from '../types';

interface CampaignsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onlineUsers: MapUser[];
    notes: MapNote[];
    currentUserProfile: UserProfile | null;
}

// Helper Component for Multi-Select Dropdown
const MultiSelectSection = ({ 
    title, 
    icon: Icon, 
    items, 
    selectedIds, 
    onToggle, 
    placeholder 
}: {
    title: string,
    icon: any,
    items: { id: string, label: string, subLabel?: string, color?: string }[],
    selectedIds: Set<string>,
    onToggle: (id: string) => void,
    placeholder: string
}) => {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);

    const filtered = items.filter(i => i.label.toLowerCase().includes(query.toLowerCase()));
    const count = selectedIds.size;

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-800 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Icon className="text-yellow-500" size={18} />
                    <span className="text-sm font-bold text-slate-200">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    {count > 0 && (
                        <span className="bg-yellow-900/40 text-yellow-400 text-xs font-mono px-2 py-0.5 rounded-full border border-yellow-900/50">
                            {count}
                        </span>
                    )}
                    <span className="text-slate-500 text-xs">{isOpen ? 'إخفاء' : 'عرض واختيار'}</span>
                </div>
            </button>

            {isOpen && (
                <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 animate-in slide-in-from-top-2">
                    {/* Search */}
                    <div className="relative mb-2">
                        <input 
                            type="text" 
                            value={query} 
                            onChange={e => setQuery(e.target.value)}
                            placeholder={placeholder}
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2 pr-8 pl-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                        />
                        <Search className="absolute right-2.5 top-2.5 text-slate-500" size={14} />
                    </div>

                    {/* List */}
                    <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-1">
                        {filtered.length === 0 ? (
                            <p className="text-center text-slate-500 text-xs py-2">لا توجد نتائج.</p>
                        ) : (
                            filtered.map(item => {
                                const isSelected = selectedIds.has(item.id);
                                return (
                                    <button 
                                        key={item.id}
                                        onClick={() => onToggle(item.id)}
                                        className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all ${isSelected ? 'bg-yellow-900/20 border-yellow-600/50' : 'bg-slate-800 border-transparent hover:bg-slate-700'}`}
                                    >
                                        <div className="flex items-center gap-3 text-right overflow-hidden">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${item.color || 'bg-slate-500'}`}></div>
                                            <div className="min-w-0">
                                                <div className={`text-xs font-bold truncate ${isSelected ? 'text-yellow-400' : 'text-slate-300'}`}>{item.label}</div>
                                                {item.subLabel && <div className="text-[10px] text-slate-500 truncate">{item.subLabel}</div>}
                                            </div>
                                        </div>
                                        {isSelected && <CheckCircle size={14} className="text-yellow-500 shrink-0" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const CampaignsModal: React.FC<CampaignsModalProps> = ({ isOpen, onClose, onlineUsers, notes, currentUserProfile }) => {
    const [campaignName, setCampaignName] = useState("");
    
    // Selections
    const [participants, setParticipants] = useState<Set<string>>(new Set());
    const [targets, setTargets] = useState<Set<string>>(new Set());
    const [commanders, setCommanders] = useState<Set<string>>(new Set([currentUserProfile?.id || '']));

    if (!isOpen) return null;

    // --- DATA PREPARATION ---
    
    // 1. Online Users (Participants)
    const availableUsers = onlineUsers.map(u => ({
        id: u.id,
        label: u.username,
        subLabel: u.status === 'patrol' ? 'دورية' : u.status,
        color: u.color
    }));

    // 2. Targets (Not Caught Notes)
    const availableTargets = notes
        .filter(n => n.status !== 'caught') // Only pending targets
        .map(n => ({
            id: n.id,
            label: n.locationName,
            subLabel: n.userNote,
            color: 'bg-red-500' // Visual indicator
        }));

    // 3. Commanders (Potential Leaders - usually online users + higher ranks)
    // For simplicity, we use online users but visual distinction can be made
    const availableCommanders = onlineUsers.map(u => ({
        id: u.id,
        label: u.username,
        subLabel: 'قائد ميداني',
        color: 'bg-purple-500'
    }));

    const toggleSet = (id: string, setFn: React.Dispatch<React.SetStateAction<Set<string>>>) => {
        setFn(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleStartCampaign = () => {
        if (!campaignName.trim() || participants.size === 0 || targets.size === 0) {
            alert("يرجى إدخال اسم الحملة واختيار قوة وأهداف على الأقل.");
            return;
        }

        const summary = `
        تم إطلاق الحملة: ${campaignName}
        القوة: ${participants.size} عنصر
        الأهداف: ${targets.size} موقع
        القيادة: ${commanders.size} ضباط
        `;

        if (confirm(summary + "\n\nهل أنت متأكد من البدء؟")) {
            // In a real app, this would write to a 'campaigns' table in Supabase
            // For now, we simulate success
            alert("تم تعميم الحملة على القوات المختارة.");
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" dir="rtl">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-950 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-yellow-900/20 p-2 rounded-lg border border-yellow-900/50">
                            <Gamepad2 className="text-yellow-500" size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">إطلاق حملة أمنية</h2>
                            <p className="text-xs text-slate-400">تخصيص القوات والأهداف والصلاحيات</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    
                    {/* Name Input */}
                    <div>
                        <label className="text-xs text-slate-400 font-bold block mb-2">اسم الحملة / العملية</label>
                        <input 
                            type="text" 
                            value={campaignName}
                            onChange={(e) => setCampaignName(e.target.value)}
                            placeholder="مثال: حملة الفجر - المنطقة الشمالية"
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-yellow-500 focus:outline-none placeholder-slate-600"
                        />
                    </div>

                    {/* Section 1: Participants */}
                    <MultiSelectSection 
                        title="القوة المشاركة (Online)" 
                        icon={Users} 
                        items={availableUsers}
                        selectedIds={participants}
                        onToggle={(id) => toggleSet(id, setParticipants)}
                        placeholder="بحث عن عناصر..."
                    />

                    {/* Section 2: Targets */}
                    <MultiSelectSection 
                        title="الأهداف المحددة" 
                        icon={MapPin} 
                        items={availableTargets}
                        selectedIds={targets}
                        onToggle={(id) => toggleSet(id, setTargets)}
                        placeholder="بحث عن مواقع..."
                    />

                    {/* Section 3: Commanders */}
                    <div className="bg-purple-900/10 rounded-xl border border-purple-900/30 p-4">
                        <div className="flex items-start gap-3 mb-4">
                            <Shield className="text-purple-400 mt-1" size={18} />
                            <div>
                                <h4 className="text-sm font-bold text-purple-200">صلاحيات الرؤية الكاملة</h4>
                                <p className="text-[10px] text-purple-300/70 leading-relaxed mt-1">
                                    المختارون هنا فقط سيرون أسماء العناصر والأهداف على الخريطة.
                                    <br/>باقي القوة المشاركة سترى نقاطاً مبهمة فقط.
                                </p>
                            </div>
                        </div>
                        
                        <MultiSelectSection 
                            title="قيادة الحملة (Command)" 
                            icon={Eye} 
                            items={availableCommanders}
                            selectedIds={commanders}
                            onToggle={(id) => toggleSet(id, setCommanders)}
                            placeholder="بحث عن ضباط..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-950 shrink-0">
                    <button 
                        onClick={handleStartCampaign}
                        className="w-full bg-yellow-600 hover:bg-yellow-500 text-slate-900 font-bold py-3 rounded-xl shadow-lg shadow-yellow-900/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Gamepad2 size={20} />
                        بدء الحملة وتعميم الإحداثيات
                    </button>
                </div>
            </div>
        </div>
    );
};
