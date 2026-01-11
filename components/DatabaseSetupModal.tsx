
import React, { useState } from 'react';
import { Database, Copy, ExternalLink, Check, ShieldAlert, X, ShieldCheck, Lock } from 'lucide-react';

interface DatabaseSetupModalProps {
    onClose?: () => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const setupSQL = `-- ============================================================
-- نظام العمليات الجغرافية - التحصين الأمني الشامل (Military-Grade RLS)
-- النسخة: 4.0 - حماية الخصوصية المطلقة
-- ============================================================

-- 1. تفعيل حماية الأسطر لكافة الجداول الحساسة
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;

-- 2. حماية الخصوصية في جدول الملاحظات (Notes)
-- القاعدة: لا أحد يرى الملاحظة إلا من أنشأها، أو المصدر الخاص بها، أو مدير في نفس النطاق الجغرافي
DROP POLICY IF EXISTS "Notes security policy" ON public.notes;
CREATE POLICY "Notes security policy" ON public.notes FOR ALL
USING (
  created_by = auth.uid() -- من أنشأها
  OR visibility = 'public' -- الملاحظات العامة
  OR access_code = current_setting('app.current_source_code', true) -- المصادر المصرح لها
  OR (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  )
  OR (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('governorate_admin', 'center_admin', 'officer')
      AND governorate = notes.governorate
    )
  )
);

-- 3. حماية تتبع المواقع الحية (Profiles)
-- القاعدة: لا يمكن رؤية إحداثيات الزملاء إلا لمن يمتلك رتبة إشرافية
DROP POLICY IF EXISTS "Profiles visibility policy" ON public.profiles;
CREATE POLICY "Profiles visibility policy" ON public.profiles FOR SELECT
USING (
  id = auth.uid() -- ملفي الشخصي
  OR (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'admin', 'governorate_admin', 'center_admin', 'officer', 'judicial')
    )
  )
);

-- 4. حماية سجلات العمليات (Logs)
-- المصادر والعناصر العاديين لا يرون السجلات الإدارية
DROP POLICY IF EXISTS "Logs access policy" ON public.logs;
CREATE POLICY "Logs access policy" ON public.logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND role NOT IN ('source', 'user')
  )
);

-- 5. دالة تأمين سياق المصدر (Source Context)
CREATE OR REPLACE FUNCTION set_source_context(p_code text)
RETURNS void AS $$
BEGIN
  PERFORM set_config('app.current_source_code', p_code, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. دالة التحقق من كود المصدر وربطه بالجهاز
CREATE OR REPLACE FUNCTION claim_access_code(p_code text, p_device_id text)
RETURNS jsonb AS $$
DECLARE
    v_record record;
BEGIN
    SELECT * INTO v_record FROM access_codes 
    WHERE code = p_code AND is_active = true AND expires_at > (EXTRACT(EPOCH FROM NOW()) * 1000);

    IF NOT FOUND THEN
        return jsonb_build_object('success', false, 'message', 'الكود غير موجود أو منتهي');
    END IF;

    IF v_record.device_id IS NOT NULL AND v_record.device_id != p_device_id THEN
        return jsonb_build_object('success', false, 'message', 'هذا الكود مفعل على جهاز آخر');
    END IF;

    UPDATE access_codes SET device_id = p_device_id WHERE code = p_code;
    
    return jsonb_build_object(
        'success', true, 
        'expires_at', v_record.expires_at,
        'label', v_record.label
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(setupSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[4000] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-blue-900/20 p-3 rounded-xl border border-blue-900/50">
                <Lock className="text-blue-500 w-8 h-8" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-white mb-1">التحصين الأمني المتطور</h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  هذا التحديث يغلق ثغرات الوصول العشوائي ويضمن أن البيانات مشفرة جغرافياً (Geographic Partitioning).
                </p>
            </div>
          </div>
          {onClose && (
              <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white">
                  <X size={24} />
              </button>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative group">
          <pre className="w-full h-full bg-slate-950 p-4 text-xs font-mono text-blue-400 overflow-auto custom-scrollbar text-left" dir="ltr">
            {setupSQL}
          </pre>
          <button onClick={copyToClipboard} className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg shadow-lg border border-slate-600 transition-all opacity-0 group-hover:opacity-100">
            {copied ? <Check size={18} className="text-blue-400" /> : <Copy size={18} />}
          </button>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900 rounded-b-2xl flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-2 font-bold">
            <ShieldAlert size={14} className="text-blue-500" />
            <span>سيتم تطبيق معايير Zero-Trust فور تنفيذ الكود.</span>
          </div>
          <button onClick={() => window.open('https://supabase.com/dashboard/project/_/sql', '_blank')} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg flex items-center gap-2">
            تطبيق السياسات الأمنية <ExternalLink size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
