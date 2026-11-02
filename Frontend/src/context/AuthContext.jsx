import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

const AuthContext = createContext({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isConfigured: false,
  signInWithGoogle: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncProfile = useCallback(async (currentUser) => {
    if (!currentUser || !supabase) return;

    const metadata = currentUser.user_metadata || {};
    const fallbackProfile = {
      id: currentUser.id,
      email: currentUser.email,
      fullName: metadata.full_name || metadata.name || currentUser.email?.split('@')[0] || 'Student',
      avatarUrl: metadata.avatar_url || metadata.picture || null,
    };

    setProfile(fallbackProfile);

    // Try to sync with Supabase profiles table if it exists
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();

      if (!error && data) {
        setProfile({
          id: data.id,
          email: currentUser.email,
          fullName: data.full_name || fallbackProfile.fullName,
          avatarUrl: data.avatar_url || fallbackProfile.avatarUrl,
          gradeLevel: data.grade_level || 'Class 8-10',
        });
      } else if (!error && !data) {
        // Upsert default profile
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          full_name: fallbackProfile.fullName,
          avatar_url: fallbackProfile.avatarUrl,
          updated_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      // Table might not exist yet; safe to ignore and keep fallbackProfile
      console.warn('[AuthContext] Note: profiles table not queried, using metadata fallback:', err?.message || err);
    }
  }, []);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        syncProfile(initialSession.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        syncProfile(currentSession.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [syncProfile]);

  const signInWithGoogle = async () => {
    if (!supabase) {
      console.error('[AuthContext] Supabase is not configured.');
      return { error: new Error('Supabase is not configured') };
    }

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      return { error };
    } catch (error) {
      console.error('[AuthContext] Error signing in with Google:', error);
      return { error };
    }
  };

  const signOut = async () => {
    if (!supabase) return;
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setSession(null);
    } catch (error) {
      console.error('[AuthContext] Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        signInWithGoogle,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
