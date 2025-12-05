import { useState, useEffect, useCallback } from 'react';
import { auth } from '../services/auth';
import { db } from '../services/db';
import { supabase } from '../services/supabase';
import { UserPermissions, UserProfile, UserRole } from '../types';

const DEFAULT_PERMISSIONS: UserPermissions = {
  can_create: true,
  can_see_others: true,
  can_navigate: true,
  can_edit_users: false,
  can_dispatch: false,
  can_view_logs: true,
  can_manage_content: false
};

export function useAuth() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [isApproved, setIsApproved] = useState<boolean>(false);
  const [isAccountDeleted, setIsAccountDeleted] = useState(false);
  const [permissions, setPermissions] = useState<UserPermissions>(DEFAULT_PERMISSIONS);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Define logic as a reusable function for manual checks
  const refreshAuth = useCallback(async () => {
      try {
        const { session } = await auth.getSession();
        
        if (session?.user) {
          // 1. Validate with server (Check if deleted)
          const { user: serverUser, error: userError } = await auth.getUser();
          
          if (userError || !serverUser) {
             console.warn("Local session exists but user not found on server");
             setIsAccountDeleted(true);
             setSession(session);
          } else {
             setSession(session);
             // 2. Fetch Profile & Role
             const profile = await db.getUserProfile(session.user.id);
             if (profile) {
                 setUserProfile(profile);
                 setUserRole(profile.role);
                 setPermissions(profile.permissions);
                 
                 // ADMIN OVERRIDE (For Super/Gov/Center Admins)
                 const isAdmin = ['super_admin', 'governorate_admin', 'center_admin', 'admin'].includes(profile.role);
                 const effectiveApproval = isAdmin ? true : profile.isApproved;
                 setIsApproved(effectiveApproval);
                 
                 // If banned, treat as not approved (or handle in UI)
                 if (profile.role === 'banned') {
                   setIsApproved(false);
                 }
             }
          }
        } else {
          setSession(null);
        }
      } catch (e) {
        console.error("Auth check failed", e);
      } finally {
        setAuthLoading(false);
      }
  }, []);

  useEffect(() => {
    // Safety timeout: If DB is too slow, don't block UI forever, but try to resolve state.
    const safetyTimeout = setTimeout(() => {
      if (authLoading) {
         console.warn("Auth check timed out, forcing UI load");
         setAuthLoading(false);
      }
    }, 4000);

    // Initial check
    refreshAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
          setSession(null);
          setUserRole(null);
          setIsApproved(false);
          setIsAccountDeleted(false);
          setPermissions(DEFAULT_PERMISSIONS);
          setUserProfile(null);
          setAuthLoading(false);
      } else if (session?.user) {
        // Re-run full check on sign-in events
        refreshAuth();
      } else {
        setAuthLoading(false);
      }
    });

    return () => {
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [refreshAuth, authLoading]);

  // Realtime Subscription for Profile Approval and Permissions
  useEffect(() => {
    if (!session?.user?.id) return;

    const channel = supabase
      .channel('profile-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${session.user.id}`
        },
        (payload: any) => {
          const newProfile = payload.new;
          if (newProfile) {
             // Map snake_case from DB to camelCase for App State
             const mappedProfile: Partial<UserProfile> = {
                 role: newProfile.role,
                 isApproved: newProfile.is_approved === true,
                 permissions: newProfile.permissions,
                 governorate: newProfile.governorate,
                 center: newProfile.center
             };

             const isAdmin = ['super_admin', 'governorate_admin', 'center_admin', 'admin'].includes(mappedProfile.role || '');
             
             // Update Approval
             if (isAdmin || mappedProfile.isApproved) {
               setIsApproved(true);
             }
             
             if (mappedProfile.role === 'banned') {
               setIsApproved(false);
               setUserRole('banned');
             } else {
               setUserRole(mappedProfile.role as UserRole);
             }

             // Update Permissions
             if (mappedProfile.permissions) {
               setPermissions(mappedProfile.permissions);
             }
             
             // Update full profile object safely
             setUserProfile(prev => prev ? ({ ...prev, ...mappedProfile }) : null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.user?.id, userRole]);

  const handleLogout = async () => {
    const mapMode = localStorage.getItem('gemini_map_mode');
    localStorage.clear(); // Aggressive clear
    if (mapMode) localStorage.setItem('gemini_map_mode', mapMode);

    try {
        const signOutPromise = auth.signOut();
        const timeoutPromise = new Promise<{error?: string}>(resolve => setTimeout(() => resolve({ error: 'timeout' }), 1000));
        await Promise.race([signOutPromise, timeoutPromise]);
    } catch (e) {
        console.error("Logout error", e);
    } finally {
        window.location.href = '/'; 
    }
  };

  return {
    session,
    authLoading,
    userRole,
    isApproved,
    permissions,
    isAccountDeleted,
    handleLogout,
    refreshAuth,
    userProfile
  };
}