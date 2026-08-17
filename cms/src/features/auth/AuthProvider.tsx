import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { setSessionExpiredHandler } from '../../services/api';
import type { User } from '../../types/api';
import { authApi } from './api';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  /** True while the initial session restore is in flight. */
  isRestoring: boolean;
  /**
   * Verify email + password. Resolves with 'mfa-required' when the account
   * has TOTP enabled (second step via verifyMfa), otherwise 'authenticated'.
   */
  login: (email: string, password: string) => Promise<'mfa-required' | 'authenticated'>;
  /** Complete a MFA-protected login with a TOTP code. */
  verifyMfa: (code: string) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Owns the session lifecycle (spec §36): restore on mount, login + MFA step,
 * logout, and a single place to react to backend session loss. The backend
 * remains authoritative – this only mirrors GET /auth/me state.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);
  // Guards against the expiry callback firing during our own restore request.
  const restoringRef = useRef(true);

  const markUnauthenticated = useCallback(() => {
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  // Session restore on mount.
  useEffect(() => {
    let cancelled = false;
    async function restore() {
      try {
        const { user: current } = await authApi.me();
        if (cancelled) return;
        setUser(current);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        markUnauthenticated();
      } finally {
        if (!cancelled) setIsRestoring(false);
        restoringRef.current = false;
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, [markUnauthenticated]);

  // React to session loss on any API call (expired, revoked, signed out elsewhere).
  useEffect(() => {
    setSessionExpiredHandler(() => {
      if (restoringRef.current) return; // restore handles its own 401
      markUnauthenticated();
    });
    return () => setSessionExpiredHandler(null);
  }, [markUnauthenticated]);

  const login = useCallback(
    async (email: string, password: string): Promise<'mfa-required' | 'authenticated'> => {
      const result = await authApi.login(email, password);
      if (result.mfaRequired) return 'mfa-required';
      if (result.user) {
        setUser(result.user);
        setStatus('authenticated');
        return 'authenticated';
      }
      throw new Error('Unexpected login response');
    },
    [],
  );

  const verifyMfa = useCallback(async (code: string): Promise<User> => {
    const { user: current } = await authApi.verifyMfa(code);
    setUser(current);
    setStatus('authenticated');
    return current;
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      await authApi.logout();
    } finally {
      markUnauthenticated();
    }
  }, [markUnauthenticated]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, isRestoring, login, verifyMfa, logout }),
    [status, user, isRestoring, login, verifyMfa, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}
