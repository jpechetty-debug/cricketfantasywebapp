import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthResponse, AuthState, Role } from '../types';

const STORAGE_KEY = 'pfl_auth';

interface AuthContextValue {
  auth: AuthState | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** When the JWT stops being valid, in ms since epoch; null if it can't be read. */
function tokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function readAuth(): AuthState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    const auth = JSON.parse(raw) as AuthState;
    const expiry = tokenExpiry(auth.token);
    if (expiry !== null && expiry <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return auth;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => readAuth());

  // Sign out as soon as the session expires, even if the tab is just left open.
  useEffect(() => {
    const expiry = auth?.token ? tokenExpiry(auth.token) : null;
    if (expiry === null) return;
    const signOut = () => {
      localStorage.removeItem(STORAGE_KEY);
      setAuth(null);
      const isAdminArea = window.location.pathname.startsWith('/admin');
      window.location.assign(isAdminArea ? '/admin/login' : '/login');
    };
    const timer = window.setTimeout(signOut, Math.max(0, expiry - Date.now()));
    return () => window.clearTimeout(timer);
  }, [auth]);

  const value = useMemo<AuthContextValue>(() => {
    const login = (data: AuthResponse) => {
      const next: AuthState = {
        token: data.access_token,
        role: data.role,
        name: data.name,
        userId: data.user_id,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setAuth(next);
    };
    const logout = () => {
      localStorage.removeItem(STORAGE_KEY);
      setAuth(null);
    };
    return {
      auth,
      isAuthenticated: Boolean(auth?.token),
      isAdmin: auth?.role === ('admin' as Role),
      login,
      logout,
    };
  }, [auth]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
