'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getStoredToken, setStoredToken } from '@/lib/api';

export type AuthUser = {
  id: string;
  email: string;
  displayName: string;
  /** 기본 `user`. JWT·GET /auth/me 기준 */
  role: 'user' | 'admin';
  /** 서비스 충전 잔액(원). 관리자는 0일 수 있음 */
  balanceWon: number;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

/** API user 객체 → 표시용 role(`admin`만 구분, 나머지 `user`) */
function toAuthUser(data: {
  id: string;
  email: string;
  displayName: string;
  role?: string;
  balanceWon?: number;
}): AuthUser {
  return {
    id: data.id,
    email: data.email,
    displayName: data.displayName,
    role: data.role === 'admin' ? 'admin' : 'user',
    balanceWon: typeof data.balanceWon === 'number' && Number.isFinite(data.balanceWon) ? data.balanceWon : 0,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    const t = getStoredToken();
    if (!t) {
      setUser(null);
      return;
    }
    try {
      const { data } = await api.get<AuthUser>('/auth/me');
      setUser(toAuthUser(data));
    } catch {
      setStoredToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await refreshMe();
      setLoading(false);
    })();
  }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post<{ access_token: string; user: Parameters<typeof toAuthUser>[0] }>(
      '/auth/login',
      {
        email,
        password,
      },
    );
    setStoredToken(data.access_token);
    setUser(toAuthUser(data.user));
  }, []);

  const register = useCallback(async (email: string, password: string, displayName?: string) => {
    const { data } = await api.post<{ access_token: string; user: Parameters<typeof toAuthUser>[0] }>(
      '/auth/register',
      {
        email,
        password,
        displayName,
      },
    );
    setStoredToken(data.access_token);
    setUser(toAuthUser(data.user));
  }, []);

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refreshMe }),
    [user, loading, login, register, logout, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/** AuthProvider 안에서만 사용 — user·loading·login·logout 등 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
