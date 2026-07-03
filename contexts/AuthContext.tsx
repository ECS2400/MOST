import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Session, User as SupabaseAuthUser } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { supabase } from '@/services/supabase';
import { User } from '@/types';
import { createSessionFromUrl, getAuthRedirectUrl } from '@/utils/authRedirect';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileName: (name: string) => Promise<void>;
  upgradeToPremium: (expiresAt?: string) => Promise<void>;
  downgradeToFree: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PROFILE_LOAD_TIMEOUT_MS = 5000;
const PROFILE_MUTATION_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: PromiseLike<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(message)), ms)
    ),
  ]);
}

function deriveDefaultName(authUser: SupabaseAuthUser): string {
  const metaName = authUser.user_metadata?.name;
  if (typeof metaName === 'string' && metaName.trim()) {
    return metaName.trim();
  }

  const emailPrefix = authUser.email?.split('@')[0]?.trim();
  if (emailPrefix) {
    return emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1);
  }

  return 'Użytkownik';
}

function resolveProfileName(row: Record<string, any>, authUser: SupabaseAuthUser): string {
  const rowName = typeof row.name === 'string' ? row.name.trim() : '';
  if (rowName) return rowName;

  const metaName = authUser.user_metadata?.name;
  if (typeof metaName === 'string' && metaName.trim()) {
    return metaName.trim();
  }

  return '';
}

function mapProfileRow(row: Record<string, any>, authUser: SupabaseAuthUser): User {
  return {
    id: authUser.id,
    email: row.email || authUser.email || '',
    name: resolveProfileName(row, authUser),
    avatarColor: row.avatar_color || '#A855F7',
    avatarUrl: row.avatar_url || null,
    plan: row.plan === 'premium' ? 'premium' : 'free',
    planExpiresAt: row.plan_expires_at || null,
    coupleId: row.couple_id || undefined,
    partnerId: row.partner_id || undefined,
    createdAt: row.created_at || authUser.created_at,
  };
}

async function loadProfile(authUser: SupabaseAuthUser): Promise<User> {
  const defaultName = deriveDefaultName(authUser);
  const email = authUser.email || '';

  const { data: existing, error: fetchError } = await withTimeout(
    supabase.from('profiles').select('*').eq('id', authUser.id).maybeSingle(),
    PROFILE_LOAD_TIMEOUT_MS,
    'Przekroczono czas oczekiwania na pobranie profilu'
  );

  if (fetchError) throw fetchError;

  if (!existing) {
    const { data: created, error: insertError } = await withTimeout(
      supabase
        .from('profiles')
        .insert({
          id: authUser.id,
          email,
          name: defaultName,
          preferred_language: 'pl',
          plan: 'free',
          avatar_color: '#A855F7',
        })
        .select('*')
        .single(),
      PROFILE_LOAD_TIMEOUT_MS,
      'Przekroczono czas oczekiwania na utworzenie profilu'
    );

    if (insertError) throw insertError;
    return mapProfileRow(created, authUser);
  }

  const resolvedName = resolveProfileName(existing, authUser);
  if (!resolvedName && defaultName !== 'Użytkownik') {
    const { data: updated, error: updateError } = await withTimeout(
      supabase
        .from('profiles')
        .update({ name: defaultName })
        .eq('id', authUser.id)
        .select('*')
        .single(),
      PROFILE_LOAD_TIMEOUT_MS,
      'Przekroczono czas oczekiwania na zapis profilu'
    );

    if (!updateError && updated) {
      return mapProfileRow(updated, authUser);
    }
  }

  return mapProfileRow(existing, authUser);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const loadUserFromSession = useCallback(async (nextSession: Session | null) => {
    if (!nextSession?.user) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const profile = await loadProfile(nextSession.user);
      setUser(profile);
    } catch {
      setUser({
        id: nextSession.user.id,
        email: nextSession.user.email || '',
        name: deriveDefaultName(nextSession.user),
        avatarColor: '#A855F7',
        avatarUrl: null,
        plan: 'free',
        planExpiresAt: null,
        createdAt: nextSession.user.created_at,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(initialSession);
        await loadUserFromSession(initialSession);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      await loadUserFromSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserFromSession]);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    await loadUserFromSession(session);
  }, [session, loadUserFromSession]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const loginWithGoogle = async () => {
    const redirectTo = getAuthRedirectUrl();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });
    if (error) throw error;

    if (Platform.OS === 'web') {
      return;
    }

    const authUrl = data?.url;
    if (!authUrl) {
      throw new Error('Nie udało się rozpocząć logowania przez Google.');
    }

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectTo);
    if (result.type !== 'success') {
      throw new Error('Logowanie przez Google zostało anulowane.');
    }

    await createSessionFromUrl(result.url);
  };

  const register = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: getAuthRedirectUrl(),
      },
    });
    if (error) throw error;

    if (data.session && data.user) {
      await supabase.from('profiles').upsert(
        {
          id: data.user.id,
          email: data.user.email,
          name: name.trim() || deriveDefaultName(data.user),
          preferred_language: 'pl',
          plan: 'free',
          avatar_color: '#A855F7',
        },
        { onConflict: 'id' }
      );
    }

    return { needsEmailConfirmation: !data.session };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  const updateProfileName = async (name: string) => {
    if (!user) throw new Error('Brak zalogowanego użytkownika');
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Imię nie może być puste');

    const { error: updateError } = await withTimeout(
      supabase
        .from('profiles')
        .update({ name: trimmed })
        .eq('id', user.id),
      PROFILE_MUTATION_TIMEOUT_MS,
      'Przekroczono czas oczekiwania na zapis imienia'
    );

    if (updateError) throw new Error(updateError.message || 'Nie udało się zapisać imienia');

    try {
      await withTimeout(
        supabase.auth.updateUser({ data: { name: trimmed } }),
        PROFILE_MUTATION_TIMEOUT_MS,
        'Przekroczono czas oczekiwania na aktualizację konta'
      );
    } catch {
      // Metadata update is optional; profile row is the source of truth.
    }

    setUser((prev) => (prev ? { ...prev, name: trimmed } : null));
    if (session) await loadUserFromSession(session);
  };

  const upgradeToPremium = async (expiresAt?: string) => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        plan: 'premium',
        plan_expires_at: expiresAt || null,
      })
      .eq('id', user.id)
      .select('*')
      .single();

    if (error || !data) {
      console.error('[AuthContext] upgradeToPremium failed', error);
      return;
    }
    setUser((prev) =>
      prev ? { ...prev, plan: 'premium', planExpiresAt: expiresAt || null } : null
    );
  };

  const downgradeToFree = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .update({
        plan: 'free',
        plan_expires_at: null,
      })
      .eq('id', user.id)
      .select('*')
      .single();

    if (error || !data) {
      console.error('[AuthContext] downgradeToFree failed', error);
      return;
    }
    setUser((prev) =>
      prev ? { ...prev, plan: 'free', planExpiresAt: null } : null
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isLoading,
        isAuthenticated: !!session,
        login,
        loginWithGoogle,
        register,
        logout,
        refreshProfile,
        updateProfileName,
        upgradeToPremium,
        downgradeToFree,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
