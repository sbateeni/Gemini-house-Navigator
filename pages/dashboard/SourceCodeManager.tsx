
import React, { useState, useEffect, useCallback } from 'react';
import { KeyRound, Copy, Check, Trash2, RefreshCcw, Loader2, X } from 'lucide-react';
import { db } from '../../services/db';
import { AccessCode } from '../../types';

interface SourceCodeManagerProps {
  isSuperAdmin: boolean;
  currentUserId: string;
  profiles: { id: string; username: string }[];
  onDataChanged?: () => void;
}

export const SourceCodeManager: React.FC<SourceCodeManagerProps> = ({
  isSuperAdmin, currentUserId, profiles, onDataChanged
}) => {
  const [accessCodes, setAccessCodes] = useState<AccessCode[]>([]);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [newCodeLabel, setNewCodeLabel] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [nowTs, setNowTs] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCodes = async () => {
      setLoading(true);
      try {
        const codes = isSuperAdmin
          ? await db.getAllAccessCodes()
          : await db.getMyAccessCodes();
        setAccessCodes(codes);
        setNowTs(Date.now());
      } finally {
        setLoading(false);
      }
    };
    fetchCodes();
  }, [isSuperAdmin]);

  const handleGenerateCode = useCallback(async () => {
    if (!newCodeLabel.trim()) return;
    setGeneratingCode(true);
    try {
      const newCode = await db.createAccessCode(newCodeLabel);
      setAccessCodes([newCode, ...accessCodes]);
      setNewCodeLabel("");
      onDataChanged?.();
    } catch {
      alert("فشل إنشاء الكود");
    } finally {
      setGeneratingCode(false);
    }
  }, [newCodeLabel, accessCodes, onDataChanged]);

  const handleRevokeCode = useCallback(async (codeStr: string) => {
    if (confirm("هل أنت متأكد من إيقاف هذا الكود؟ يمكنك إعادة تفعيله لاحقاً.")) {
      try {
        setAccessCodes(prev => prev.map(c => c.code === codeStr ? { ...c, is_active: false } : c));
        await db.revokeAccessCode(codeStr);
        onDataChanged?.();
      } catch {
        alert("فشل إيقاف الكود. يرجى المحاولة مرة أخرى.");
      }
    }
  }, [onDataChanged]);

  const handleRenewCode = useCallback(async (codeStr: string) => {
    if (confirm("تمديد/إعادة تفعيل الكود لمدة 30 دقيقة إضافية؟")) {
      try {
        await db.renewAccessCode(codeStr);
        const newExpires = Date.now() + 30 * 60 * 1000;
        setNowTs(Date.now());
        setAccessCodes(prev => prev.map(c => c.code === codeStr ? { ...c, is_active: true, expires_at: newExpires } : c));
        alert("تم تمديد الوقت بنجاح");
      } catch {
        alert("فشل التمديد");
      }
    }
  }, []);

  const copyCode = useCallback((code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const getCreatorName = (id: string) => {
    if (id === currentUserId) return 'أنت';
    return profiles.find(p => p.id === id)?.username || 'مستخدم';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-green-500 w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
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

      <div className="space-y-3">
        {accessCodes.length === 0 && <p className="text-center text-slate-500 py-8">لم يتم العثور على أكواد مصادر نشطة.</p>}
        {accessCodes.map(ac => {
          const isExpired = nowTs > ac.expires_at;
          const timeLeft = Math.max(0, Math.ceil((ac.expires_at - nowTs) / 60000));
          const isActive = ac.is_active && !isExpired;
          const creatorName = getCreatorName(ac.created_by);

          return (
            <div key={ac.code} className={`flex items-center justify-between p-4 rounded-xl border ${isActive ? 'bg-slate-800 border-slate-700' : 'bg-slate-900 border-slate-800 opacity-80'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-lg bg-slate-950 border ${isActive ? 'border-green-500/30 text-green-400' : 'border-red-900/30 text-red-500'}`}>
                  {isActive ? <KeyRound size={20} /> : <X size={20} />}
                </div>
                <div>
                  <div className="text-white font-bold">{ac.label || 'بدون اسم'}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    بواسطة: <span className="text-blue-400">{creatorName}</span>
                  </div>
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
                    {!ac.is_active ? 'محذوف/متوقف' : isExpired ? 'منتهي الصلاحية' : 'نشط'}
                  </div>
                  {isActive && (
                    <div className="text-[10px] text-slate-500">متبقي {timeLeft} دقيقة</div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRenewCode(ac.code)}
                    className="p-2 bg-blue-900/20 hover:bg-blue-900/40 text-blue-500 rounded-lg border border-blue-900/50 transition-colors"
                    title="إعادة تفعيل / تمديد الوقت"
                  >
                    <RefreshCcw size={16} />
                  </button>
                  <button
                    onClick={() => handleRevokeCode(ac.code)}
                    className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-lg border border-red-900/50 transition-colors"
                    title="إيقاف الكود"
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
  );
};
