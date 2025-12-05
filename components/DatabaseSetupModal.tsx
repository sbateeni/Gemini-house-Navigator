
import React, { useState } from 'react';
import { Database, Copy, ExternalLink, Check, ShieldAlert } from 'lucide-react';

export const DatabaseSetupModal: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const setupSQL = `
-- ==========================================
-- إصلاح الخطأ: PGRST202 (Function Missing)
-- ==========================================

-- 1. التأكد من وجود عمود device_id في جدول الأكواد
alter table access_codes add column if not exists device_id text;

-- 2. حذف الدالة القديمة (لتجنب تعارض التوقيع)
drop function if exists claim_access_code;

-- 3. إنشاء الدالة الأمنية للتحقق من الكود والجهاز
create or replace function claim_access_code(
  p_code text,
  p_device_id text
)
returns jsonb as $$
declare
  v_record record;
begin
  -- البحث عن الكود
  select * into v_record from access_codes where code = p_code;
  
  -- 1. هل الكود موجود؟
  if v_record is null then
    return jsonb_build_object('success', false, 'message', 'الكود غير صحيح');
  end if;
  
  -- 2. هل الكود فعال؟
  if v_record.is_active = false then
     return jsonb_build_object('success', false, 'message', 'تم تعطيل هذا الكود');
  end if;

  -- 3. هل انتهت الصلاحية؟
  if (extract(epoch from now()) * 1000) > v_record.expires_at then
     return jsonb_build_object('success', false, 'message', 'انتهت صلاحية الكود');
  end if;

  -- 4. التحقق من تطابق الجهاز (Device Binding)
  if v_record.device_id is not null and v_record.device_id != p_device_id then
     return jsonb_build_object('success', false, 'message', 'هذا الكود مرتبط بجهاز آخر. لا يمكن استخدامه هنا.');
  end if;

  -- 5. ربط الجهاز لأول مرة
  if v_record.device_id is null then
     update access_codes set device_id = p_device_id where code = p_code;
  end if;

  return jsonb_build_object('success', true, 'expires_at', v_record.expires_at);
end;
$$ language plpgsql security definer;

-- ==========================================
-- 4. إعداد باقي الجداول (لضمان عمل النظام)
-- ==========================================

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  username text,
  role text default 'user',
  is_approved boolean default false,
  email text,
  permissions jsonb,
  governorate text,
  center text,
  last_seen bigint,
  lat float8,
  lng float8
);
alter table profiles enable row level security;
create policy "Public profiles" on profiles for select using (auth.role() = 'authenticated');
create policy "Self insert" on profiles for insert with check (auth.uid() = id);
create policy "Self update" on profiles for update using (auth.uid() = id);

create table if not exists notes (
  id text primary key,
  lat float8,
  lng float8,
  user_note text,
  location_name text,
  ai_analysis text,
  created_at bigint,
  status text,
  sources jsonb,
  governorate text,
  center text,
  created_by uuid references auth.users(id),
  access_code text,
  visibility text default 'private'
);
alter table notes enable row level security;
create policy "Public Read" on notes for select using (true); 
create policy "Auth Insert" on notes for insert with check (true);
create policy "Auth Update" on notes for update using (true);
create policy "Auth Delete" on notes for delete using (true);

create table if not exists access_codes (
  code text primary key,
  created_by uuid references auth.users(id),
  created_at bigint,
  expires_at bigint,
  label text,
  is_active boolean default true,
  device_id text
);
alter table access_codes enable row level security;
create policy "Public Access" on access_codes for select using (true);
create policy "Auth Manage" on access_codes for all using (auth.role() = 'authenticated');

-- Reload Schema Cache (Often fixes PGRST202 instantly)
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
    <div className="fixed inset-0 z-[1500] bg-slate-950 flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
        
        <div className="p-6 border-b border-slate-800 flex items-start gap-4">
          <div className="bg-red-900/20 p-3 rounded-xl border border-red-900/50">
            <ShieldAlert className="text-red-500 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white mb-1">خطأ في الاتصال بقاعدة البيانات (PGRST202)</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              الدالة المطلوبة <code>claim_access_code</code> غير موجودة أو أن توقيعها (Parameters) قديم.
              <br/>
              الرجاء نسخ الكود بالأسفل وتشغيله في محرر SQL في Supabase لإصلاح المشكلة.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative group">
          <pre className="w-full h-full bg-slate-950 p-4 text-xs font-mono text-green-400 overflow-auto custom-scrollbar text-left" dir="ltr">
            {setupSQL}
          </pre>
          <button 
            onClick={copyToClipboard}
            className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white p-2 rounded-lg shadow-lg border border-slate-600 transition-all opacity-0 group-hover:opacity-100"
            title="نسخ الكود"
          >
            {copied ? <Check size={18} className="text-green-400" /> : <Copy size={18} />}
          </button>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900 rounded-b-2xl flex items-center justify-between gap-4">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <Database size={14} />
            <span>يجب تشغيل هذا الكود يدوياً في Supabase Dashboard</span>
          </div>
          
          <div className="flex gap-3">
            <button 
                onClick={copyToClipboard}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold text-sm transition-colors border border-slate-700"
            >
                {copied ? 'تم النسخ' : 'نسخ الكود'}
            </button>
            <button 
                onClick={openSupabase}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-blue-900/20 flex items-center gap-2"
            >
                فتح SQL Editor <ExternalLink size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
