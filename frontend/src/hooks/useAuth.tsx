import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
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

function readAuth(): AuthState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState | null>(() => readAuth());

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
