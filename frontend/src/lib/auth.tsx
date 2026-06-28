"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { loginUser, logoutUser, getUserProfile, registerUser, refreshToken as refreshTokenApi } from "./api";
import type { AuthState, LoginPayload, RegisterPayload, UserProfile } from "@/types";

// =============================================================================
//  Context
// =============================================================================

interface AuthContextValue extends AuthState {
  login:    (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout:   () => Promise<void>;
  loading:  boolean;
  ready:    boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function persistTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem("access_token", accessToken);
  localStorage.setItem("refresh_token", refreshToken);
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

// =============================================================================
//  Provider
// =============================================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser]                 = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken]   = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [ready, setReady]               = useState(false);

  useEffect(() => {
    async function restoreSession() {
      const savedAccess  = localStorage.getItem("access_token");
      const savedRefresh = localStorage.getItem("refresh_token");

      if (!savedAccess || !savedRefresh) {
        setLoading(false);
        setReady(true);
        return;
      }

      setAccessToken(savedAccess);
      setRefreshToken(savedRefresh);

      try {
        const profile = await getUserProfile();
        setUser(profile);
      } catch {
        try {
          const tokens = await refreshTokenApi(savedRefresh);
          persistTokens(tokens.accessToken, tokens.refreshToken);
          setAccessToken(tokens.accessToken);
          setRefreshToken(tokens.refreshToken);
          const profile = await getUserProfile();
          setUser(profile);
        } catch {
          clearTokens();
          setUser(null);
          setAccessToken(null);
          setRefreshToken(null);
        }
      } finally {
        setLoading(false);
        setReady(true);
      }
    }

    restoreSession();
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    const tokens = await loginUser(payload);
    persistTokens(tokens.accessToken, tokens.refreshToken);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    const profile = await getUserProfile();
    setUser(profile);
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    const tokens = await registerUser(payload);
    persistTokens(tokens.accessToken, tokens.refreshToken);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
    const profile = await getUserProfile();
    setUser(profile);
  }, []);

  const logout = useCallback(async () => {
    try { await logoutUser(); } catch { /* ignore */ }
    clearTokens();
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        loading,
        ready,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =============================================================================
//  Hook
// =============================================================================

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
