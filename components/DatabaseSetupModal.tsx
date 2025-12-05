
import React, { useState } from 'react';
import { Database, Copy, ExternalLink, Check, ShieldAlert, X } from 'lucide-react';

interface DatabaseSetupModalProps {
    onClose?: () => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const setupSQL = `
-- ==========================================
-- إصلاح شامل لقاعدة البيانات (تحديث الأعمدة)
-- ==========================================

-- 1. التأكد من وجود الجداول الأساسية
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

-- *** إصلاح مشكلة الحفظ: التأكد من وجود عمود visibility ***
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notes' AND column_name='visibility') THEN
        ALTER TABLE notes ADD COLUMN visibility text default 'private';
    END IF;
END $$;

create table if not exists access_codes (
  code text primary key,
  created_by uuid references auth.users(id),
  created_at bigint,
  expires_at bigint,
  label text,
  is_active boolean default true,
  device_id text
);

create table if not exists logs (
  id uuid default gen_random_uuid() primary key,
  message text,
  type text,
  user_id uuid references auth.users(id),
  timestamp bigint,
  governorate text,
  center text
);

create table if not exists assignments (
  id uuid default gen_random_uuid() primary key,
  target_user_id uuid references auth.users(id),
  location_id text,
  location_name text,
  lat float8,
  lng float8,
  instructions text,
  status text default 'pending', 
  created_by uuid references auth.users(id),
  created_at bigint
);

-- جدول الحملات الجديد
create table if not exists campaigns (
  id uuid default gen_random_uuid() primary key,
  name text,
  participants jsonb, -- Array of IDs
  targets jsonb, -- Array of IDs
  commanders jsonb, -- Array of IDs
  start_time bigint,
  is_active boolean default true,
  created_by uuid references auth.users(id)
);

-- 2. تفعيل RLS
alter table profiles enable row level security;
alter table notes enable row level security;
alter table access_codes enable row level security;
alter table logs enable row level security;
alter table assignments enable row level security;
alter table campaigns enable row level security;

-- 3. تحديث السياسات (Fix 42501 Error)

-- سياسات Notes
DROP POLICY IF EXISTS "Enable Read for Users and Sources" ON notes;
CREATE POLICY "Enable Read for Users and Sources" ON notes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable Insert for Users" ON notes;
CREATE POLICY "Enable Insert for Users" ON notes FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Enable Update for Users" ON notes;
CREATE POLICY "Enable Update for Users" ON notes FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable Delete for Users" ON notes;
CREATE POLICY "Enable Delete for Users" ON notes FOR DELETE USING (auth.role() = 'authenticated');

-- سياسات Profiles
DROP POLICY IF EXISTS "Public profiles" ON profiles;
CREATE POLICY "Public profiles" on profiles for select using (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Self insert" ON profiles;
CREATE POLICY "Self insert" on profiles for insert with check (auth.uid() = id);

DROP POLICY IF EXISTS "Self update" ON profiles;
CREATE POLICY "Self update" on profiles for update using (auth.uid() = id OR exists (select 1 from profiles where id = auth.uid() and role in ('super_admin', 'admin')));

-- سياسات Access Codes
DROP POLICY IF EXISTS "Read Codes" ON access_codes;
CREATE POLICY "Read Codes" on access_codes for select using (true);

DROP POLICY IF EXISTS "Manage Codes" ON access_codes;
CREATE POLICY "Manage Codes" on access_codes for all using (auth.role() = 'authenticated');

-- سياسات Campaigns
DROP POLICY IF EXISTS "Read Campaigns" ON campaigns;
CREATE POLICY "Read Campaigns" on campaigns for select using (true);

DROP POLICY IF EXISTS "Manage Campaigns" ON campaigns;
CREATE POLICY "Manage Campaigns" on campaigns for all using (auth.role() = 'authenticated');

-- 4. إصلاح دالة المصادر (تجاوز RLS)
create or replace function create_source_note(p_code text, p_note_data jsonb)
returns void as $$
begin
  if exists (select 1 from access_codes where code = p_code and is_active = true) then
    insert into notes (id, lat, lng, user_note, location_name, ai_analysis, created_at, status, sources, access_code, visibility)
    values (
      (p_note_data->>'id'), (p_note_data->>'lat')::float8, (p_note_data->>'lng')::float8,
      (p_note_data->>'userNote'), (p_note_data->>'locationName'), (p_note_data->>'aiAnalysis'),
      (p_note_data->>'createdAt')::bigint, (p_note_data->>'status'), (p_note_data->'sources'),
      p_code, coalesce(p_note_data->>'visibility', 'private')
    );
  else
    raise exception 'Invalid code';
  end if;
end;
$$ language plpgsql security definer;

-- 5. إصلاح علاقات FK
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS notes_created_by_fkey;
ALTER TABLE public.notes ADD CONSTRAINT notes_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES auth.users(id);

-- تحديث الكاش
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
            <div className="bg-red-900/20 p-3 rounded-xl border border-red-900/50">
                <ShieldAlert className="text-red-500 w-8 h-8" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-white mb-1">تحديث قاعدة البيانات (مطلوب)</h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                تم إضافة جدول جديد "campaigns" لدعم الحملات الجماعية. يرجى تنفيذ الكود أدناه.
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
