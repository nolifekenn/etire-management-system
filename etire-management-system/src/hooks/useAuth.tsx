"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface ExtendedUser {
  user_id: string;
  email?: string;
  username?: string;
  name?: string;
  role?: number;
}

interface AuthContextType {
  user: ExtendedUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: false,
  login: async () => false,
  logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 🟢 Try loading stored user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("etire_user");
    if (storedUser) setUser(JSON.parse(storedUser));
  }, []);
  // 🟣 Login directly from public.user (no Supabase Auth)
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    const emailForAuth = `${username}@queenr.local`;

    try {
      console.log("🔐 Attempting local DB login for:", username);

      const client = supabase;
      if (!client || !client.auth) {
        console.error("Supabase client is not initialized");
        return false;
      }

      const { data, error } = await client.auth.signInWithPassword({
        email: emailForAuth,
        password: password,
      });

      if (error) {
        console.error("Login error:", error.message);
        return false;
      }

      if (data?.user) {
        const displayUsername = data.user.user_metadata?.username || data.user.email?.split('@')[0];

        const loggedInUser: ExtendedUser = {
          user_id: data.user.id,
          name: data.user.user_metadata?.name || displayUsername,
          username: displayUsername,
          role: data.user.user_metadata?.role || 0,
        };

        setUser(loggedInUser);
        // Update local storage logic here if you wish to keep it
        // localStorage.setItem("etire_user", JSON.stringify(loggedInUser));
        return true;
      }

      return false;
    } catch (err) {
      console.error("Unexpected Login Error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    console.log("🚪 Logging out...");
    setUser(null);
    localStorage.removeItem("etire_user");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
