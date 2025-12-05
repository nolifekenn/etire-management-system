"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

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
  isLoading: true,
  login: async () => false,
  logout: () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    // Safety timeout to prevent infinite loading (5 seconds)
    const safetyTimeout = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn("[useAuth] Auth initialization timed out (5s). Forcing isLoading = false.");
        setIsLoading(false);
      }
    }, 5000);

    const initializeAuth = async () => {
      console.log("[useAuth] initializeAuth started");
      try {
        // First, try to get the session from cookies (set by proxy.ts)
        // This reads local storage/cookies which should be in sync after proxy runs
        const { data: { session }, error: sessionError } = await supabase!.auth.getSession();

        if (sessionError) {
          console.error("[useAuth] getSession error:", sessionError);
        }

        // If we have a session, validate it with the server
        if (session?.user) {
          console.log("[useAuth] Session found, validating with server...");

          // Validate session is still valid on server (this also refreshes token if needed)
          const { data: { user: authUser }, error: userError } = await supabase!.auth.getUser();

          if (userError || !authUser) {
            console.log("[useAuth] Session invalid on server:", userError?.message);
            // Clear stale session
            await supabase!.auth.signOut();
            if (mounted) {
              setUser(null);
              setIsLoading(false);
            }
            return;
          }

          // Session is valid, fetch user profile
          const { data: profile, error } = await supabase!
            .from("user")
            .select("user_id, name, username, role")
            .eq("uuid", authUser.id)
            .single();

          if (profile && !error && mounted) {
            console.log("[useAuth] Profile found:", (profile as any).username);
            setUser(profile as any);
          } else if (mounted) {
            console.error("[useAuth] Failed to fetch user profile:", JSON.stringify(error, null, 2));
            if (!profile) {
              console.warn("[useAuth] No user profile found. Logging out.");
              await supabase!.auth.signOut();
              setUser(null);
              router.push("/login?error=missing_profile");
            }
          }
        } else {
          console.log("[useAuth] No session found in cookies");
          if (mounted) {
            setUser(null);
          }
        }
      } catch (error) {
        console.error("[useAuth] Error initializing auth:", error);
      } finally {
        if (mounted) {
          console.log("[useAuth] initializeAuth finished, setting isLoading = false");
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase!.auth.onAuthStateChange(async (event, session) => {
      console.log("[useAuth] Auth State Change:", event, session?.user?.email);

      if (event === 'SIGNED_OUT') {
        if (mounted) {
          console.log("[useAuth] Handling SIGNED_OUT");
          setUser(null);
          setIsLoading(false);
          router.push("/login");
        }
        return;
      }

      if (session?.user && mounted) {
        // Fetch user profile from public.user
        const { data: profile, error } = await supabase!
          .from("user")
          .select("user_id, name, username, role")
          .eq("uuid", session.user.id)
          .single();

        if (profile && !error && mounted) {
          console.log("[useAuth] AuthStateChange: Profile found/updated");
          setUser(profile as any);
        } else if (mounted) {
          console.error("[useAuth] AuthStateChange: Failed to fetch user profile:", error);
        }
      } else if (mounted) {
        console.log("[useAuth] AuthStateChange: No user in session");
        setUser(null);
      }

      if (mounted) {
        console.log("[useAuth] AuthStateChange: setting isLoading = false");
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [router]);

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log("useAuth: login called");
    // Do NOT set global isLoading(true) here. Let the local login component handle the UI feedback.
    // This prevents the global loader from masking the login success animation.
    try {
      // Use dummy email format as per project convention
      const email = `${username}@etire-system.local`;

      const { error } = await supabase!.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Login Error:", error.message);
        return false;
      }

      console.log("Login successful");
      return true;
    } catch (err) {
      console.error("Login Exception:", err);
      return false;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await supabase!.auth.signOut();
      // State updates and redirect are handled by onAuthStateChange ('SIGNED_OUT' event)
    } catch (error) {
      console.error("Logout Error:", error);
      setIsLoading(false);
    }
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