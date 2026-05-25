/* eslint-disable react/prop-types, react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  clearAuthSession,
  isAuthSessionExpired,
  loadAuthSession,
  saveAuthSession,
} from "../auth";

const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const restoreSession = () => {
      const savedSession = loadAuthSession();
      if (!savedSession?.token || isAuthSessionExpired(savedSession)) {
        clearAuthSession();
        setSession(null);
        setIsChecking(false);
        return;
      }

      saveAuthSession(savedSession);
      setSession(savedSession);
      setIsChecking(false);
    };

    restoreSession();
  }, []);

  const login = async ({ adminId, password }) => {
    const response = await fetch("/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        adminId,
        password,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Login failed");
    }

    const nextSession = {
      token: data.token,
      adminId: data.adminId,
      expiresAt: data.expiresAt,
    };

    saveAuthSession(nextSession);
    setSession(nextSession);
    return nextSession;
  };

  const logout = () => {
    clearAuthSession();
    setSession(null);
  };

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session?.token),
      isChecking,
      login,
      logout,
    }),
    [session, isChecking]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

export { AuthProvider, useAuth };
