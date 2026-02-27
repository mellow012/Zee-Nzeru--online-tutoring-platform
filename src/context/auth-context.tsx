'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { createClient } from '../lib/supabase/client';
import type { AuthUser } from '../lib/types';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: SignupData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

interface SignupData {
  email: string;
  password: string;
  fullName: string;
  role?: 'student' | 'tutor';
  phoneNumber?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Singleton client — never recreated, prevents LockManager contention
const supabase = createClient();

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const mounted   = useRef(true);
  // Prevents concurrent syncUser calls — the root cause of the lock timeout
  const isSyncing = useRef(false);

  /**
   * Fetches the profile row and sets user state.
   * Accepts the raw auth user object — does NOT call getUser() internally.
   */
  const syncUser = useCallback(async (authUser: any) => {
    if (!authUser) {
      if (mounted.current) setUser(null);
      return;
    }

    // Skip if a sync is already in flight — this is what prevents the race
    if (isSyncing.current) return;
    isSyncing.current = true;

    try {
      let profile: { role: string; full_name: string; avatar_url: string | null } | null = null;

      for (let attempt = 0; attempt < 4; attempt++) {
        const { data, error } = await supabase
          .from('profiles')
          .select('role, full_name, avatar_url')
          .eq('user_id', authUser.id)
          .single();

        if (data) { profile = data; break; }

        if (error?.code === 'PGRST116') {
          // Row not found — on 3rd attempt create it as a trigger fallback
          if (attempt === 2) {
            console.warn('[AuthContext] Profile missing — creating fallback');
            const role = (authUser.user_metadata?.role as string) || 'student';
            const { data: created, error: createError } = await supabase
              .from('profiles')
              .insert({
                user_id:      authUser.id,
                role,
                full_name:    authUser.user_metadata?.full_name    ?? '',
                phone_number: authUser.user_metadata?.phone_number ?? null,
                is_active:    true,
              })
              .select('role, full_name, avatar_url')
              .single();

            if (createError) {
              console.error('[AuthContext] Fallback profile creation failed:', createError.message);
            } else {
              profile = created;
              break;
            }
          }
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }

        console.error('[AuthContext] Profile fetch error:', error?.message);
        break;
      }

      if (!mounted.current) return;

      setUser({
        userId:    authUser.id,
        email:     authUser.email ?? '',
        role:      (profile?.role ?? authUser.user_metadata?.role) as AuthUser['role'],
        fullName:  profile?.full_name ?? authUser.user_metadata?.full_name ?? '',
        avatarUrl: profile?.avatar_url ?? null,
      });
    } finally {
      isSyncing.current = false;
    }
  }, []);

  useEffect(() => {
    mounted.current = true;

    // ── Initial session check ──────────────────────────────────────────────
    // ONE call to getUser() on mount — that's it.
    // onAuthStateChange below does NOT call getUser() again.
    const initAuth = async () => {
      const timeout = setTimeout(() => {
        if (mounted.current) {
          console.warn('[AuthContext] Init timed out — unblocking');
          setIsLoading(false);
        }
      }, 8000);

      try {
        const { data: { user: serverUser } } = await supabase.auth.getUser();
        if (mounted.current) {
          if (serverUser) await syncUser(serverUser);
          else setUser(null);
        }
      } catch (err) {
        console.error('[AuthContext] initAuth error:', err);
      } finally {
        clearTimeout(timeout);
        // setIsLoading(false) only fires here — after syncUser has fully resolved
        if (mounted.current) setIsLoading(false);
      }
    };

    initAuth();

    // ── Auth state listener ────────────────────────────────────────────────
    // Uses session.user directly — never calls getUser() here.
    // NO setIsLoading(false) in this listener — initAuth owns the loading flag.
    // Having it here caused a race where isLoading went false before user was set.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        try {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user && mounted.current) {
              await syncUser(session.user);
            }
          }
          if (event === 'SIGNED_OUT') {
            if (mounted.current) setUser(null);
          }
        } catch (err) {
          console.error('[AuthContext] onAuthStateChange error:', err);
        }
        // ← intentionally no setIsLoading(false) here
      }
    );

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
    };
  }, [syncUser]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const signup = async (data: SignupData) => {
    if (!data.email || !data.password || !data.fullName) {
      return { success: false, error: 'Email, password, and full name are required' };
    }
    if (data.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    try {
      const { error } = await supabase.auth.signUp({
        email:    data.email,
        password: data.password,
        options: {
          data: {
            role:         data.role ?? 'student',
            full_name:    data.fullName,
            phone_number: data.phoneNumber ?? null,
          },
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        console.error('[AuthContext] Signup error:', error.message);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('[AuthContext] Signup exception:', err);
      return { success: false, error: String(err) };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};