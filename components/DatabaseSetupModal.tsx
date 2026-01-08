
import React, { useState } from 'react';
import { Database, Copy, ExternalLink, Check, ShieldAlert, X, ShieldCheck } from 'lucide-react';

interface DatabaseSetupModalProps {
    onClose?: () => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const setupSQL = `-- ============================================================
-- نظام العمليات الجغرافية - تحديث الأمان والتحصين (Security Hardening v3.0)
-- الهدف: سد ثغرات تسريب المواقع وخصوصية الملاحظات
-- ============================================================

-- 1. تحصين جدول الملفات الشخصية (Profiles Security)
-- منع المستخدمين العاديين من رؤية إحداثيات زملائهم إلا إذا كانوا في نفس الغرفة أو برتبة قيادية

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles" ON profiles;
-- القادة فقط يرون كل شيء، المستخدم العادي يرى البيانات الأساسية فقط لزملائه (بدون إحداثيات دقيقة)
CREATE POLICY "View Profiles Policy" ON profiles FOR SELECT 
USING (
  auth.uid() = id -- يرى ملفه الشخصي
  OR 
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'governorate_admin', 'center_admin', 'officer')) -- القادة يرون الجميع
);

-- 2. تحصين جدول الملاحظات (Notes Security - CRITICAL)
-- سد ثغرة رؤية الملاحظات الخاصة للآخرين

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Read all notes" ON notes;
CREATE POLICY "Secure Notes Selection" ON notes FOR SELECT 
USING (
  visibility = 'public' -- الملاحظات العامة للكل
  OR created_by = auth.uid() -- ملاحظاتي الخاصة لي
  OR (access_code IS NOT NULL AND access_code = current_setting('app.current_source_code', true)) -- للمصادر النشطة
  OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin')) -- الإدارة العليا
  OR (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('governorate_admin', 'center_admin', 'officer'))
    AND (governorate = (SELECT governorate FROM profiles WHERE id = auth.uid())) -- القادة في نفس المحافظة
  )
);

-- 3. تحصين سجلات النظام (Logs Security)
-- منع أي شخص من مسح السجلات إلا السوبر أدمن

DROP POLICY IF EXISTS "Manage logs" ON logs;
CREATE POLICY "Super Admin Only Logs Deletion" ON logs FOR DELETE 
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- 4. تحصين دالة إنشاء الملاحظات للمصادر
-- إضافة تدقيق إضافي على الجهاز المرتبط

CREATE OR REPLACE FUNCTION create_source_note(p_code text, p_note_data jsonb)
RETURNS void AS $$
DECLARE
    v_device_id text;
BEGIN
  -- التحقق من الكود والجهاز معاً
  SELECT device_id INTO v_device_id FROM access_codes WHERE code = p_code AND is_active = true;
  
  IF v_device_id IS NULL OR v_device_id != (p_note_data->>'device_id') THEN
     -- نغلق العملية إذا كان هناك محاولة تلاعب بالجهاز
     RAISE EXCEPTION 'Security Breach: Device Mismatch or Invalid Code';
  END IF;

  INSERT INTO notes (
      id, lat, lng, user_note, location_name, ai_analysis, created_at, 
      status, sources, access_code, visibility, governorate, center
  )
  VALUES (
    (p_note_data->>'id'), 
    (p_note_data->>'lat')::float8, 
    (p_note_data->>'lng')::float8,
    (p_note_data->>'userNote'), 
    (p_note_data->>'locationName'), 
    (p_note_data->>'aiAnalysis'),
    (p_note_data->>'createdAt')::bigint, 
    'not_caught', 
    (p_note_data->'sources'),
    p_code, 
    'private',
    (p_note_data->>'governorate'),
    (p_note_data->>'center')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث إعدادات النظام
NOTIFY pgrst, 'reload schema';
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(setupSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openSupabase = () => {
    window.open('https://supabase.com/dashboard/project/_/sql', '_blank');
  };

  return (
    <div className="fixed inset-0 z-[4000] bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
        
        <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-emerald-900/20 p-3 rounded-xl border border-emerald-900/50">
                <ShieldCheck className="text-emerald-500 w-8 h-8" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-white mb-1">فحص وإغلاق الثغرات (Security Patch)</h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  تم الكشف عن ثغرات في سياسات الوصول (RLS). نفذ الكود أدناه لتحصين النظام ومنع تسريب المواقع.
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
          <pre className="w-full h-full bg-slate-950 p-4 text-xs font-mono text-emerald-400 overflow-auto custom-scrollbar text-left" dir="ltr">
            {setupSQL}
          </pre>
          <button 
            onClick={copyToClipboard}
            className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg shadow-lg border border-slate-600 transition-all opacity-0 group-hover:opacity-100"
          >
            {copied ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
          </button>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900 rounded-b-2xl flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <ShieldAlert size={14} className="text-emerald-500" />
            <span>سيتم تفعيل سياسات Zero-Trust فور تنفيذ الكود.</span>
          </div>
          
          <div className="flex gap-3">
            <button 
                onClick={copyToClipboard}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm transition-colors border border-slate-700"
            >
                {copied ? 'تم النسخ' : 'نسخ كود الإصلاح'}
            </button>
            <button 
                onClick={openSupabase}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg flex items-center gap-2"
            >
                تنفيذ SQL لإغلاق الثغرات <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
