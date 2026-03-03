"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  nickname: string | null;
  loading: boolean;
  login: (
    nickname: string,
    password: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

const SESSION_KEY = "medlean_auth";

interface SessionData {
  nickname: string;
  authenticatedAt: number;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [nickname, setNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      if (stored) {
        const data: SessionData = JSON.parse(stored);
        if (data.nickname && data.nickname.trim().length > 0) {
          setNickname(data.nickname);
          setIsAuthenticated(true);
        }
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(
    async (
      inputNickname: string,
      password: string
    ): Promise<{ success: boolean; error?: string }> => {
      try {
        const trimmed = inputNickname.trim();
        if (!trimmed)
          return { success: false, error: "ニックネームを入力してください" };
        if (trimmed.length > 50)
          return {
            success: false,
            error: "ニックネームは50文字以内で入力してください",
          };
        if (!password)
          return { success: false, error: "パスワードを入力してください" };

        const response = await fetch("/api/auth/verify-password/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nickname: trimmed, password }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setNickname(trimmed);
          setIsAuthenticated(true);
          sessionStorage.setItem(
            SESSION_KEY,
            JSON.stringify({
              nickname: trimmed,
              authenticatedAt: Date.now(),
            } satisfies SessionData)
          );
          return { success: true };
        }

        if (response.status === 429) {
          return {
            success: false,
            error:
              "試行回数が多すぎます。しばらく待ってから再度お試しください。",
          };
        }
        if (response.status === 401) {
          return { success: false, error: "パスワードが正しくありません" };
        }

        return {
          success: false,
          error: data.error || "ログインに失敗しました",
        };
      } catch {
        return {
          success: false,
          error: "ネットワークエラーが発生しました",
        };
      }
    },
    []
  );

  const logout = useCallback(() => {
    setNickname(null);
    setIsAuthenticated(false);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated, nickname, loading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}
