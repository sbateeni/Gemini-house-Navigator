
import React, { useState } from 'react';
import { Database, Copy, ExternalLink, Check, ShieldAlert } from 'lucide-react';
import { supabase } from '../services/supabase';

export const DatabaseSetupModal: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const setupSQL = `
-- ==========================================
-- 1. جدول الملفات الشخصية (Profiles)
-- ==========================================
create table if not exists profiles (
  id uuid references auth.users on delete cascade,
  username text,
  role text default 'user',
  is_approved boolean default false,
  email text,
  permissions jsonb default '{"can_create": true, "can_see_others": true, "can_navigate": true, "can_edit_users": false, "can_dispatch": false, "can_view_logs": true}'::jsonb,
  governorate text,
  center text,
  last_seen bigint,
  lat float8,
  lng float8,
  primary key (id)
);

-- Security: RLS Policies for Profiles
alter table profiles enable row level security;

-- Allow read access to approved users
drop policy if exists "Public profiles" on profiles;
create policy "Public profiles" on profiles for select using (
  auth.role() = 'authenticated'
);

-- Allow users to insert their own profile
drop policy if exists "Self insert" on profiles;
create policy "Self insert" on profiles for insert with check (auth.uid() = id);

-- Strict Update Policy: Users update self, Admins update according to hierarchy
drop policy if exists "Strict update" on profiles;
create policy "Strict update" on profiles for update using (
  auth.uid() = id OR 
  exists (
     select 1 from profiles editor 
     where editor.id = auth.uid() 
     and editor.role in ('super_admin', 'governorate_admin', 'center_admin', 'admin', 'officer')
  )
);

-- ==========================================
-- 2. جدول الملاحظات والمواقع (Notes) - تحديث أمني
-- ==========================================
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
  visibility text default 'private' -- 'public' or 'private'
);

-- إضافة العمود إذا لم يكن موجوداً
alter table notes add column if not exists visibility text default 'private';

alter table notes enable row level security;

-- STRICT READ POLICY:
-- 1. Everyone sees 'public' notes.
-- 2. Users see their own 'private' notes.
-- 3. Admins/Officers see 'private' notes based on hierarchy logic.
drop policy if exists "Secure Read Notes" on notes;
create policy "Secure Read Notes" on notes for select using (
  visibility = 'public' 
  OR auth.uid() = created_by 
  OR access_code IS NOT NULL
  OR exists (
    select 1 from profiles viewer 
    where viewer.id = auth.uid() 
    and (
       viewer.role in ('super_admin', 'admin') -- Super admins see all
       OR (viewer.role = 'governorate_admin' AND viewer.governorate = notes.governorate)
       OR (viewer.role in ('center_admin', 'officer') AND viewer.center = notes.center)
    )
  )
);

-- Insert Policy
drop policy if exists "Auth insert" on notes;
create policy "Auth insert" on notes for insert with check (auth.role() = 'authenticated');

-- Update Policy
drop policy if exists "Auth update" on notes;
create policy "Auth update" on notes for update using (auth.role() = 'authenticated');

-- Delete Policy: Restricted to admins/officers
drop policy if exists "Admin delete" on notes;
create policy "Admin delete" on notes for delete using (
  exists (select 1 from profiles where id = auth.uid() and role in ('super_admin', 'governorate_admin', 'center_admin', 'officer', 'admin'))
);

-- ==========================================
-- 3. باقي الجداول (Assignments, Logs, Access Codes)
-- ==========================================

-- Assignments
create table if not exists assignments (
  id uuid default gen_random_uuid() primary key,
  target_user_id uuid not null references auth.users(id),
  location_id text not null,
  location_name text,
  lat float8 not null,
  lng float8 not null,
  instructions text,
  status text default 'pending', 
  created_by uuid references auth.users(id),
  created_at bigint
);
alter table assignments enable row level security;
drop policy if exists "Assign Read" on assignments;
create policy "Assign Read" on assignments for select using (auth.uid() = target_user_id OR auth.uid() = created_by);
drop policy if exists "Assign Write" on assignments;
create policy "Assign Write" on assignments for all using (auth.role() = 'authenticated');

-- Logs
create table if not exists logs (
  id uuid default gen_random_uuid() primary key,
  message text not null,
  type text not null, 
  user_id uuid references auth.users(id),
  timestamp bigint,
  governorate text,
  center text
);
alter table logs enable row level security;
drop policy if exists "Log Read" on logs;
create policy "Log Read" on logs for select using (true);
drop policy if exists "Log Write" on logs;
create policy "Log Write" on logs for insert with check (auth.role() = 'authenticated');

-- Access Codes
create table if not exists access_codes (
  code text primary key,
  created_by uuid references auth.users(id),
  created_at bigint,
  expires_at bigint,
  label text,
  is_active boolean default true,
  device_id text -- New column for device binding
);

-- Ensure device_id column exists
alter table access_codes add column if not exists device_id text;

alter table access_codes enable row level security;
drop policy if exists "Code Manage" on access_codes;
create policy "Code Manage" on access_codes for all using (
  exists (select 1 from profiles where id = auth.uid() and role in ('super_admin', 'governorate_admin', 'center_admin', 'officer', 'admin'))
);
drop policy if exists "Code Read Public" on access_codes;
create policy "Code Read Public" on access_codes for select using (true);

-- ==========================================
-- 4. الدوال (Functions)
-- ==========================================

-- Function to securely claim an access code for a device
create or replace function claim_access_code(
  p_code text,
  p_device_id text
)
returns jsonb as $$
declare
  v_record record;
begin
  -- Find the code
  select * into v_record from access_codes where code = p_code;
  
  -- Check existence
  if v_record is null then
    return jsonb_build_object('success', false, 'message', 'الكود غير صحيح');
  end if;
  
  -- Check active status
  if v_record.is_active = false then
     return jsonb_build_object('success', false, 'message', 'تم تعطيل هذا الكود');
  end if;

  -- Check expiry
  if (extract(epoch from now()) * 1000) > v_record.expires_at then
     return jsonb_build_object('success', false, 'message', 'انتهت صلاحية الكود');
  end if;

  -- Check Device Binding (Security)
  if v_record.device_id is not null and v_record.device_id != p_device_id then
     return jsonb_build_object('success', false, 'message', 'تم استخدام هذا الكود على جهاز آخر مسبقاً. لا يمكن مشاركة الكود.');
  end if;

  -- Bind Device if it's the first time
  if v_record.device_id is null then
     update access_codes set device_id = p_device_id where code = p_code;
  end if;

  return jsonb_build_object('success', true, 'expires_at', v_record.expires_at);
end;
$$ language plpgsql security definer;

-- RPC for Source Note Creation (Bypassing Auth for Guests)
create or replace function create_source_note(
  p_code text,
  p_note_data jsonb
)
returns void as $$
declare
  v_exists boolean;
begin
  -- Verify code validity
  select exists(
    select 1 from access_codes 
    where code = p_code 
    and is_active = true 
    and expires_at > (extract(epoch from now()) * 1000)
  ) into v_exists;

  if not v_exists then
    raise exception 'Invalid or expired access code';
  end if;

  -- Insert Note
  insert into notes (
    id, lat, lng, user_note, location_name, ai_analysis, 
    created_at, status, sources, access_code, visibility
  ) values (
    (p_note_data->>'id'),
    (p_note_data->>'lat')::float8,
    (p_note_data->>'lng')::float8,
    (p_note_data->>'userNote'),
    (p_note_data->>'locationName'),
    (p_note_data->>'aiAnalysis'),
    (p_note_data->>'createdAt')::bigint,
    (p_note_data->>'status'),
    (p_note_data->'sources'),
    p_code,
    coalesce(p_note_data->>'visibility', 'private')
  );
end;
$$ language plpgsql security definer;
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
            <h1 className="text-xl font-bold text-white mb-1">تحديث قاعدة البيانات مطلوب</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              تم اكتشاف نقص في جداول أو أعمدة قاعدة البيانات (مثل نظام الحماية للجهاز `device_id` أو `visibility`). <br/>
              لضمان عمل النظام بشكل صحيح، يجب تشغيل الكود التالي في محرر SQL في Supabase.
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
            <span>انسخ الكود أعلاه وشغله في Supabase SQL Editor</span>
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
                فتح Supabase SQL <ExternalLink size={16} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
