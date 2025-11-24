import { supabase } from './supabase';

export const auth = {
  async signUp(email: string, password: string, username: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username,
        },
      },
    });
    return { data, error };
  },

  async signIn(email: string, password: string, rememberMe: boolean = true) {
    try {
        // Note: setPersistence is not available on the Supabase v2 auth client instance directly.
        // Persistence is handled by the storage configuration of the client (defaults to localStorage).
        // For dynamic persistence (session vs local), one would need separate clients or custom storage adapters.
        // We will proceed with the default behavior.
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { data, error };
    } catch (e: any) {
        return { data: { user: null, session: null }, error: e };
    }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, // Redirect back to app after click
    });
    return { data, error };
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession();
    return { session: data.session, error };
  }
};