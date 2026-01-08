
import { createClient } from '@supabase/supabase-js';

// التحقق من كافة الاحتمالات لمفاتيح البيئة (Vite vs Vercel Standard)
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const isConfigured = Boolean(supabaseUrl && supabaseKey && supabaseUrl.includes('supabase.co'));

// إنشاء العميل الحقيقي أو كائن وهمي للمعاينة فقط في حال غياب الإعدادات تماماً
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseKey) 
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
        signInWithPassword: async () => ({ 
          data: { user: null, session: null }, 
          error: { message: "إعدادات Supabase غير مكتملة في Vercel. تأكد من إضافة SUPABASE_URL و SUPABASE_ANON_KEY في Environment Variables." } 
        }),
        signUp: async () => ({ data: { user: null, session: null }, error: { message: "التسجيل معطل." } }),
        resetPasswordForEmail: async () => ({ data: null, error: { message: "معطل." } }),
        resend: async () => ({ data: null, error: { message: "معطل." } }),
      },
      from: () => ({
        select: () => ({ 
          order: () => ({ 
            limit: () => ({ 
              maybeSingle: () => Promise.resolve({ data: null, error: null }),
              single: () => Promise.resolve({ data: null, error: null })
            }),
            eq: () => ({ 
              single: () => Promise.resolve({ data: null, error: null }),
              maybeSingle: () => Promise.resolve({ data: null, error: null })
            })
          }),
          eq: () => ({ 
            single: () => Promise.resolve({ data: null, error: null }),
            maybeSingle: () => Promise.resolve({ data: null, error: null }),
            order: () => ({ limit: () => Promise.resolve({ data: [], error: null }) })
          })
        }),
        upsert: () => Promise.resolve({ error: null }),
        insert: () => Promise.resolve({ error: null }),
        update: () => ({ eq: () => Promise.resolve({ error: null }) }),
        delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
      }),
      rpc: () => Promise.resolve({ data: null, error: null }),
      channel: () => ({
        on: () => ({ subscribe: () => ({}) }),
        track: () => Promise.resolve(),
        subscribe: () => ({})
      }),
      removeChannel: () => {}
    } as any;

if (!isConfigured) {
  console.warn("Supabase keys are missing or invalid. Check your Vercel/Local environment variables.");
}
