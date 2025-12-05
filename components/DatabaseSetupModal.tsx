
import React, { useState } from 'react';
import { Database, Copy, ExternalLink, Check, ShieldAlert, X } from 'lucide-react';

interface DatabaseSetupModalProps {
    onClose?: () => void;
}

export const DatabaseSetupModal: React.FC<DatabaseSetupModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const setupSQL = `
-- ============================================================
-- GEMINI MAP JOURNAL - COMPLETE DATABASE SCHEMA (V2.0)
-- يشمل: المستخدمين، الملاحظات، المصادر، السجلات، المهام، والحملات
-- ============================================================

-- 1. إعداد الجداول (Tables Setup)
-- استخدام IF NOT EXISTS لتجنب الأخطاء عند التشغيل المتكرر

-- جدول الملفات الشخصية (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username text,
  role text DEFAULT 'user',
  is_approved boolean DEFAULT false,
  email text,
  permissions jsonb DEFAULT '{"can_create": true, "can_see_others": true, "can_navigate": true, "can_edit_users": false, "can_dispatch": false, "can_view_logs": false, "can_manage_content": false}'::jsonb,
  governorate text,
  center text,
  last_seen bigint,
  lat float8,
  lng float8
);

-- جدول الملاحظات/المواقع (Notes)
CREATE TABLE IF NOT EXISTS public.notes (
  id text PRIMARY KEY,
  lat float8 NOT NULL,
  lng float8 NOT NULL,
  user_note text,
  location_name text,
  ai_analysis text,
  created_at bigint,
  status text DEFAULT 'not_caught',
  sources jsonb DEFAULT '[]'::jsonb,
  governorate text,
  center text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  access_code text,
  visibility text DEFAULT 'private'
);

-- جدول أكواد المصادر (Access Codes)
CREATE TABLE IF NOT EXISTS public.access_codes (
  code text PRIMARY KEY,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at bigint,
  expires_at bigint,
  label text,
  is_active boolean DEFAULT true,
  device_id text
);

-- جدول السجلات (Logs)
CREATE TABLE IF NOT EXISTS public.logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  message text,
  type text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  timestamp bigint,
  governorate text,
  center text
);

-- جدول المهام والتكليفات (Assignments)
CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  target_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  location_id text,
  location_name text,
  lat float8,
  lng float8,
  instructions text,
  status text DEFAULT 'pending', 
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at bigint
);

-- جدول الحملات الأمنية (Campaigns)
CREATE TABLE IF NOT EXISTS public.campaigns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text,
  participants jsonb DEFAULT '[]'::jsonb, -- Array of User IDs
  targets jsonb DEFAULT '[]'::jsonb,      -- Array of Note IDs
  commanders jsonb DEFAULT '[]'::jsonb,   -- Array of Commander IDs
  start_time bigint,
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. تحديث الأعمدة المفقودة (Column Migrations)
-- يضمن هذا الجزء وجود الأعمدة الجديدة حتى لو كانت الجداول موجودة مسبقاً

DO $$
BEGIN
    -- Notes Table Updates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notes' AND column_name='visibility') THEN
        ALTER TABLE public.notes ADD COLUMN visibility text DEFAULT 'private';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notes' AND column_name='access_code') THEN
        ALTER TABLE public.notes ADD COLUMN access_code text;
    END IF;

    -- Profiles Table Updates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_seen') THEN
        ALTER TABLE public.profiles ADD COLUMN last_seen bigint;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='lat') THEN
        ALTER TABLE public.profiles ADD COLUMN lat float8;
        ALTER TABLE public.profiles ADD COLUMN lng float8;
    END IF;

    -- Access Codes Updates
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='access_codes' AND column_name='device_id') THEN
        ALTER TABLE public.access_codes ADD COLUMN device_id text;
    END IF;
END $$;

-- 3. تفعيل الحماية (Row Level Security - RLS)

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- 4. إعداد السياسات الأمنية (RLS Policies)
-- نقوم بحذف السياسات القديمة أولاً لتجنب التكرار ثم إنشائها من جديد

-- (أ) سياسات Profiles
DROP POLICY IF EXISTS "Public profiles" ON profiles;
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Self insert" ON profiles;
CREATE POLICY "Self insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Self update" ON profiles;
CREATE POLICY "Self update" ON profiles FOR UPDATE USING (auth.uid() = id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'governorate_admin')));

-- (ب) سياسات Notes
DROP POLICY IF EXISTS "Read all notes" ON notes;
CREATE POLICY "Read all notes" ON notes FOR SELECT USING (true); -- Public read allowed for map logic (filtering happens in app/query)

DROP POLICY IF EXISTS "Insert authenticated" ON notes;
CREATE POLICY "Insert authenticated" ON notes FOR INSERT WITH CHECK (auth.role() = 'authenticated' OR access_code IS NOT NULL);

DROP POLICY IF EXISTS "Update authenticated" ON notes;
CREATE POLICY "Update authenticated" ON notes FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Delete authenticated" ON notes;
CREATE POLICY "Delete authenticated" ON notes FOR DELETE USING (auth.role() = 'authenticated');

-- (ج) سياسات Access Codes
DROP POLICY IF EXISTS "Read access codes" ON access_codes;
CREATE POLICY "Read access codes" ON access_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Manage access codes" ON access_codes;
CREATE POLICY "Manage access codes" ON access_codes FOR ALL USING (auth.role() = 'authenticated');

-- (د) سياسات Logs
DROP POLICY IF EXISTS "Read logs" ON logs;
CREATE POLICY "Read logs" ON logs FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Insert logs" ON logs;
CREATE POLICY "Insert logs" ON logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Manage logs" ON logs;
CREATE POLICY "Manage logs" ON logs FOR DELETE USING (auth.role() = 'authenticated');

-- (هـ) سياسات Assignments
DROP POLICY IF EXISTS "Assignments policy" ON assignments;
CREATE POLICY "Assignments policy" ON assignments FOR ALL USING (auth.role() = 'authenticated');

-- (و) سياسات Campaigns
DROP POLICY IF EXISTS "Campaigns policy" ON campaigns;
CREATE POLICY "Campaigns policy" ON campaigns FOR ALL USING (auth.role() = 'authenticated');


-- 5. الدوال والإجراءات المخزنة (Functions & RPCs)

-- دالة: إنشاء مستخدم جديد تلقائياً عند التسجيل (Auth Hook)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, role, is_approved, permissions)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.email,
    'user',
    false,
    '{"can_create": true, "can_see_others": true, "can_navigate": true}'::jsonb
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تفعيل التريجر (Trigger)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- دالة: تسجيل الدخول بكود المصدر (Source Login & Device Binding)
CREATE OR REPLACE FUNCTION claim_access_code(p_code text, p_device_id text)
RETURNS jsonb AS $$
DECLARE
    v_record record;
BEGIN
    -- البحث عن الكود
    SELECT * INTO v_record FROM access_codes WHERE code = p_code;

    -- 1. الكود غير موجود
    IF v_record IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'الكود غير صحيح');
    END IF;

    -- 2. الكود غير نشط
    IF v_record.is_active = false THEN
        RETURN jsonb_build_object('success', false, 'message', 'تم إيقاف هذا الكود');
    END IF;

    -- 3. الكود منتهي الصلاحية
    IF v_record.expires_at < (EXTRACT(EPOCH FROM NOW()) * 1000) THEN
        RETURN jsonb_build_object('success', false, 'message', 'انتهت صلاحية الكود');
    END IF;

    -- 4. فحص الجهاز (Device Binding)
    IF v_record.device_id IS NOT NULL AND v_record.device_id != p_device_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'هذا الكود مرتبط بجهاز آخر');
    END IF;

    -- 5. ربط الجهاز إذا كان جديداً
    IF v_record.device_id IS NULL THEN
        UPDATE access_codes SET device_id = p_device_id WHERE code = p_code;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'expires_at', v_record.expires_at,
        'label', v_record.label
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- دالة: إنشاء ملاحظة بواسطة المصدر (Bypass RLS via RPC)
CREATE OR REPLACE FUNCTION create_source_note(p_code text, p_note_data jsonb)
RETURNS void AS $$
BEGIN
  -- التحقق من صلاحية الكود مرة أخرى لزيادة الأمان
  IF EXISTS (
      SELECT 1 FROM access_codes 
      WHERE code = p_code 
      AND is_active = true 
      AND expires_at > (EXTRACT(EPOCH FROM NOW()) * 1000)
  ) THEN
    INSERT INTO notes (
        id, lat, lng, user_note, location_name, ai_analysis, created_at, 
        status, sources, access_code, visibility
    )
    VALUES (
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
      COALESCE(p_note_data->>'visibility', 'private')
    );
  ELSE
    RAISE EXCEPTION 'Invalid or expired code';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحديث الكاش في Supabase لضمان ظهور التغييرات فوراً
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
            <div className="bg-blue-900/20 p-3 rounded-xl border border-blue-900/50">
                <Database className="text-blue-500 w-8 h-8" />
            </div>
            <div>
                <h1 className="text-xl font-bold text-white mb-1">إعداد قاعدة البيانات (SQL شامل)</h1>
                <p className="text-slate-400 text-sm leading-relaxed">
                  هذا الكود يحتوي على كل الجداول والصلاحيات والدوال المطلوبة. انسخه ونفذه في Supabase SQL Editor.
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
            <ShieldAlert size={14} className="text-yellow-500" />
            <span>يمكن تشغيل هذا الكود بأمان حتى لو كانت الجداول موجودة مسبقاً (Idempotent).</span>
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
