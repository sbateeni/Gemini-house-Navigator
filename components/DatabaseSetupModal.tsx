
import React, { useState } from 'react';
import { Database, Copy, ExternalLink, Check, ShieldAlert } from 'lucide-react';
import { supabase } from '../services/supabase';

export const DatabaseSetupModal: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const setupSQL = `
-- 1. Create profiles table (for User/Admin roles)
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
  lat float8, -- New: Store last known latitude
  lng float8, -- New: Store last known longitude
  primary key (id)
);

-- Update existing table
alter table profiles add column if not exists last_seen bigint;
alter table profiles add column if not exists lat float8;
alter table profiles add column if not exists lng float8;

-- 2. Enable Security on Profiles
alter table profiles enable row level security;
drop policy if exists "Public profiles" on profiles;
create policy "Public profiles" on profiles for select using (true);

drop policy if exists "Self insert" on profiles;
create policy "Self insert" on profiles for insert with check (auth.uid() = id);

drop policy if exists "Admin update" on profiles;
create policy "Admin update" on profiles for update using (
  auth.uid() = id OR 
  exists (select 1 from profiles where id = auth.uid() and role in ('super_admin', 'governorate_admin', 'center_admin'))
);

-- 3. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, role, is_approved, email, permissions)
  values (
    new.id, 
    new.raw_user_meta_data->>'username', 
    'user', 
    false, 
    new.email,
    '{"can_create": true, "can_see_others": true, "can_navigate": true, "can_edit_users": false, "can_dispatch": false, "can_view_logs": true}'::jsonb
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Secure the Notes Table
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
  center text
);

alter table notes enable row level security;

drop policy if exists "Public Access" on notes;
drop policy if exists "Auth read" on notes;
drop policy if exists "Auth insert" on notes;
drop policy if exists "Auth update" on notes;
drop policy if exists "Admin delete" on notes;

create policy "Auth read" on notes for select using (auth.role() = 'authenticated');
create policy "Auth insert" on notes for insert with check (auth.role() = 'authenticated');
create policy "Auth update" on notes for update using (auth.role() = 'authenticated');
-- Admin Delete Policy: Includes Super, Gov, Center admins
create policy "Admin delete" on notes for delete using (
  exists (select 1 from profiles where id = auth.uid() and role in ('super_admin', 'governorate_admin', 'center_admin'))
);

-- 5. Create Assignments Table
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
drop policy if exists "Read assignments" on assignments;
create policy "Read assignments" on assignments for select using (
  auth.uid() = target_user_id OR auth.uid() = created_by
);

drop policy if exists "Create assignments" on assignments;
create policy "Create assignments" on assignments for insert with check (
  auth.role() = 'authenticated'
);

drop policy if exists "Update assignments" on assignments;
create policy "Update assignments" on assignments for update using (
  auth.uid() = target_user_id OR auth.uid() = created_by
);

-- 6. Create Logs Table
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
drop policy if exists "Read logs" on logs;
create policy "Read logs" on logs for select using (true);

drop policy if exists "Create logs" on logs;
create policy "Create logs" on logs for insert with check (auth.role() = 'authenticated');

drop policy if exists "Admin delete logs" on logs;
create policy "Admin delete logs" on logs for delete using (
  exists (select 1 from profiles where id = auth.uid() and role in ('super_admin', 'governorate_admin', 'center_admin', 'admin'))
);
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(setupSQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openSupabaseSQL = () => {
    const projectUrl = (supabase as any).supabaseUrl || '';
    const projectId = projectUrl.split('//')[1]?.split('.')[0];
    const dashboardUrl = projectId 
      ? `https://supabase.com/dashboard/project/${projectId}/sql/new` 
      : 'https://supabase.com/dashboard';
    
    window.open(dashboardUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-950 flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 bg-slate-900 flex items-start gap-4">
          <div className="p-3 bg-purple-900/20 rounded-xl border border-purple-900/50">
            <Database className="text-purple-500 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white mb-1">تحديث قاعدة البيانات مطلوب</h1>
            <p className="text-slate-400 text-sm">
              تم إضافة ميزات جديدة (حفظ الموقع الأخير). يرجى تحديث جدول <span className="text-blue-400 font-bold mx-1">profiles</span>.
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative bg-slate-950 p-0 group">
          <pre className="h-full overflow-auto p-6 text-xs md:text-sm font-mono text-green-400/90 leading-relaxed scrollbar-thin text-left" dir="ltr">
            {setupSQL}
          </pre>
          <button 
            onClick={copyToClipboard}
            className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-bold border border-slate-600 flex items-center gap-2 shadow-xl transition-all"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            {copied ? 'تم النسخ' : 'نسخ الكود'}
          </button>
        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0">
          <div className="flex flex-col md:flex-row gap-4 items-center">
             <button 
               onClick={openSupabaseSQL}
               className="w-full md:w-auto flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
             >
               <ExternalLink size={18} />
               فتح محرر Supabase SQL
             </button>
             <button 
               onClick={() => window.location.reload()}
               className="w-full md:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-all"
             >
               تم التحديث، إعادة تحميل
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};
