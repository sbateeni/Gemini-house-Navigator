
import React, { useState } from 'react';
import { Database, Terminal, Copy, ExternalLink, Check, ShieldAlert } from 'lucide-react';
import { supabase } from '../services/supabase';

export const DatabaseSetupModal: React.FC = () => {
  const [copied, setCopied] = useState(false);

  // The SQL needed to setup the SECURE database structure
  const setupSQL = `
-- 1. Create profiles table (for User/Admin roles)
create table if not exists profiles (
  id uuid references auth.users on delete cascade,
  username text,
  role text default 'user',
  is_approved boolean default false,
  email text,
  permissions jsonb default '{"can_create": true, "can_see_others": true, "can_navigate": true}'::jsonb,
  primary key (id)
);

-- 2. Enable Security on Profiles
alter table profiles enable row level security;
drop policy if exists "Public profiles" on profiles;
create policy "Public profiles" on profiles for select using (true);

drop policy if exists "Self insert" on profiles;
create policy "Self insert" on profiles for insert with check (auth.uid() = id);

drop policy if exists "Admin update" on profiles;
create policy "Admin update" on profiles for update using (
  auth.uid() = id OR 
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
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
    '{"can_create": true, "can_see_others": true, "can_navigate": true}'::jsonb
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Secure the Notes Table
alter table notes enable row level security;

drop policy if exists "Public Access" on notes;
drop policy if exists "Auth read" on notes;
drop policy if exists "Auth insert" on notes;
drop policy if exists "Auth update" on notes;
drop policy if exists "Admin delete" on notes;

create policy "Auth read" on notes for select using (
  auth.role() = 'authenticated' and 
  exists (select 1 from profiles where id = auth.uid() and is_approved = true)
);

create policy "Auth insert" on notes for insert with check (
  auth.role() = 'authenticated' and
  exists (select 1 from profiles where id = auth.uid() and is_approved = true)
);

create policy "Auth update" on notes for update using (
  auth.role() = 'authenticated' and
  exists (select 1 from profiles where id = auth.uid() and is_approved = true)
);

create policy "Admin delete" on notes for delete using (
  exists (select 1 from profiles where id = auth.uid() and role = 'admin')
);

-- 5. Create Assignments Table (Operations Dispatch)
create table if not exists assignments (
  id uuid default gen_random_uuid() primary key,
  target_user_id uuid not null references auth.users(id),
  location_id text not null,
  location_name text,
  lat float8 not null,
  lng float8 not null,
  instructions text,
  status text default 'pending', -- pending, accepted, completed
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
    <div className="fixed inset-0 z-[2000] bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 bg-slate-900 flex items-start gap-4">
          <div className="p-3 bg-red-900/20 rounded-xl border border-red-900/50">
            <ShieldAlert className="text-red-500 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white mb-1">Update Required: Ops System</h1>
            <p className="text-slate-400 text-sm">
              The app needs the new <span className="text-purple-400 font-bold mx-1">Assignments Table</span> for the Tactical Dispatch System.
            </p>
          </div>
        </div>

        {/* Code Block */}
        <div className="flex-1 overflow-hidden relative bg-slate-950 p-0 group">
          <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-slate-950 to-transparent z-10"></div>
          <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-950 to-transparent z-10"></div>
          
          <pre className="h-full overflow-auto p-6 text-xs md:text-sm font-mono text-green-400/90 leading-relaxed scrollbar-thin">
            {setupSQL}
          </pre>

          <button 
            onClick={copyToClipboard}
            className="absolute top-4 right-4 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg text-xs font-bold border border-slate-600 flex items-center gap-2 shadow-xl transition-all"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            {copied ? 'COPIED' : 'COPY SQL'}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-slate-800 bg-slate-900 shrink-0">
          <div className="flex flex-col md:flex-row gap-4 items-center">
             <button 
               onClick={openSupabaseSQL}
               className="w-full md:w-auto flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
             >
               <ExternalLink size={18} />
               Open Supabase SQL Editor
             </button>
             <button 
               onClick={() => window.location.reload()}
               className="w-full md:w-auto px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition-all"
             >
               I've run the code, Refresh
             </button>
          </div>
          <p className="text-center text-xs text-slate-500 mt-4">
            Paste the code into the SQL Editor and click "Run", then refresh this page.
          </p>
        </div>
      </div>
    </div>
  );
};
