"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { setToken, clearToken } from "./api";
import { posthog } from "./posthog";
import type { UserDTO } from "./types/dto";

interface AuthContextValue {
  user: UserDTO | null;
  loading: boolean;
  login: (token: string, user: UserDTO) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("segmentor_user");
      if (stored) {
        const parsed = JSON.parse(stored) as UserDTO;
        setUser(parsed);
        posthog.identify(parsed.id, {
          email: parsed.email,
          name: parsed.name,
          createdAt: parsed.createdAt,
        });
      }
    } catch {
      /* localStorage unavailable or corrupt data */
    }
    setLoading(false);
  }, []);

  const login = useCallback((token: string, userData: UserDTO) => {
    setToken(token);
    try {
      localStorage.setItem("segmentor_user", JSON.stringify(userData));
    } catch { /* localStorage unavailable */ }
    setUser(userData);
    posthog.identify(userData.id, {
      email: userData.email,
      name: userData.name,
      createdAt: userData.createdAt,
    });
  }, []);

  const logout = useCallback(() => {
    clearToken();
    try {
      localStorage.removeItem("segmentor_user");
    } catch { /* localStorage unavailable */ }
    setUser(null);
    posthog.reset();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
