"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { loginAction } from "@/lib/action"; // 🟢 Import the server action we created

// Match this interface to the data your 'user' table returns
interface ExtendedUser {
  user_id: string;
  name: string; // Ensure this matches your DB column (e.g. 'name' or 'first_name')
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
  const [isLoading, setIsLoading] = useState(true);

  // 🟢 Try loading stored user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("etire_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user", e);
        localStorage.removeItem("etire_user");
      }
    }
    setIsLoading(false);
  }, []);

  // 🟣 Login using the Server Action (Safe "Username Only" login)
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);

    try {
      console.log("🔐 Attempting login via Server Action for:", username);

      // 1. Call the Server Action instead of Supabase Auth directly
      const result = await loginAction(username, password);

      if (result.success && result.user) {
        console.log("✅ Login successful");
        
        // 2. Save user to state
        setUser(result.user as ExtendedUser);
        
        // 3. Persist to localStorage so they stay logged in on refresh
        localStorage.setItem("etire_user", JSON.stringify(result.user));
        return true;
      }
      
      // Handle failure
      console.error("❌ Login failed:", result.message);
      return false;

    } catch (err) {
      console.error("❌ Unexpected Login Error:", err);
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