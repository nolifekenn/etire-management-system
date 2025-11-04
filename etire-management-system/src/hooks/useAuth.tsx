"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

interface ExtendedUser {
  user_id: string;
  name: string;
  username: string;
  role: number;
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
    try {
      console.log("🔐 Attempting local DB login for:", username);

      const { data, error } = await supabase
        .from("user")
        .select("user_id, name, username, password, role")
        .eq("username", username)
        .single();

      if (error) {
        console.error("❌ Login DB error:", error.message);
        return false;
      }

      if (!data) {
        console.warn("⚠️ No user found for:", username);
        return false;
      }

      if (data.password !== password) {
        console.warn("⚠️ Incorrect password for user:", username);
        return false;
      }

      const loggedInUser: ExtendedUser = {
        user_id: data.user_id,
        name: data.name,
        username: data.username,
        role: data.role,
      };

      console.log(`✅ Login successful for ${data.username}, Role: ${data.role}`);

      setUser(loggedInUser);
      localStorage.setItem("etire_user", JSON.stringify(loggedInUser));
      return true;
    } catch (err) {
      console.error("Login error:", err);
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
