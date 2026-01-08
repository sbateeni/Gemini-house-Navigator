
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

export const isConfigured = Boolean(supabaseUrl && supabaseKey);

// إنشاء العميل فقط إذا كانت الإعدادات متوفرة، وإلا توفير كائن فارغ آمن
export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseKey) 
  : {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signOut: async () => ({ error: null }),
      },
      from: () => ({
        select: () => ({ order: () => ({ limit: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }), eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }),
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
  console.warn("إعدادات Supabase مفقودة. التطبيق يعمل الآن في 'وضع المعاينة' (Preview Mode) بدون قاعدة بيانات سحابية.");
}
