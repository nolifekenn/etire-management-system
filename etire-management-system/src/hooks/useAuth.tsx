"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
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
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;
    let hasInitialized = false; // Prevent double-processing

    // Check if supabase client is available
    if (!supabase) {
      console.error("[useAuth] Supabase client is not available. Check environment variables.");
      setUser(null);
      setIsLoading(false);
      return;
    }

    // Safety timeout to prevent infinite loading (10 seconds)
    safetyTimeoutRef.current = setTimeout(() => {
      if (mounted && isLoading) {
        console.warn("[useAuth] Auth initialization timed out (10s). Forcing isLoading = false.");
        setIsLoading(false);
      }
    }, 10000);

    const fetchUserProfile = async (authUserId: string): Promise<ExtendedUser | null> => {
      try {
        const { data: profile, error } = await supabase
          .from("user")
          .select("user_id, name, username, role")
          .eq("uuid", authUserId)
          .single();

        if (profile && !error) {
          console.log("[useAuth] Profile found:", (profile as any).username);
          return profile as any;
        } else {
          console.error("[useAuth] Failed to fetch user profile:", error);
          return null;
        }
      } catch (err) {
        console.error("[useAuth] Exception fetching user profile:", err);
        return null;
      }
    };

    const initializeAuth = async () => {
      console.log("[useAuth] initializeAuth started");
      try {
        // Get session - this is the primary source of truth
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("[useAuth] getSession error:", sessionError);
          // Don't return here - continue to set loading false
        }

        if (session?.user) {
          console.log("[useAuth] Session found, validating with server...");

          // Validate session is still valid on server
          const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

          if (userError || !authUser) {
            console.log("[useAuth] Session invalid on server:", userError?.message);
            await supabase.auth.signOut();
            if (mounted) {
              setUser(null);
              setIsLoading(false);
              hasInitialized = true;
              if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
            }
            return;
          }

          // Session is valid, fetch user profile
          const profile = await fetchUserProfile(authUser.id);
          if (mounted) {
            if (profile) {
              setUser(profile);
            } else {
              console.warn("[useAuth] No user profile found. Logging out.");
              await supabase.auth.signOut();
              setUser(null);
              router.push("/login?error=missing_profile");
            }
            setIsLoading(false);
            hasInitialized = true;
            if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
          }
        } else {
          // No session found - user is not logged in
          console.log("[useAuth] No session found");
          if (mounted) {
            setUser(null);
            setIsLoading(false);
            hasInitialized = true;
            if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
          }
        }
      } catch (error) {
        console.error("[useAuth] Error initializing auth:", error);
        if (mounted) {
          setUser(null);
          setIsLoading(false);
          hasInitialized = true;
          if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[useAuth] Auth State Change:", event, session?.user?.email);

      // Clear safety timeout when we get any auth state change
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }

      // Handle sign out
      if (event === 'SIGNED_OUT') {
        if (mounted) {
          console.log("[useAuth] Handling SIGNED_OUT");
          setUser(null);
          setIsLoading(false);
          hasInitialized = true;
          router.push("/login");
        }
        return;
      }

      // For INITIAL_SESSION, skip if we've already initialized via getSession
      // This prevents the race condition where INITIAL_SESSION fires before getSession completes
      if (event === 'INITIAL_SESSION' && hasInitialized) {
        console.log("[useAuth] Skipping INITIAL_SESSION - already initialized via getSession");
        return;
      }

      // Handle session events (SIGNED_IN, TOKEN_REFRESHED, INITIAL_SESSION)
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user && mounted) {
        console.log(`[useAuth] Handling ${event} - fetching profile`);

        const profile = await fetchUserProfile(session.user.id);
        if (mounted) {
          if (profile) {
            setUser(profile);
          }
          setIsLoading(false);
          hasInitialized = true;
        }
        return;
      }

      // Handle other events or no session
      if (!session?.user && mounted) {
        console.log("[useAuth] AuthStateChange: No user in session");
        setUser(null);
        setIsLoading(false);
        hasInitialized = true;
      }
    });

    return () => {
      mounted = false;
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, [router]);

  const login = async (username: string, password: string): Promise<boolean> => {
    console.log("useAuth: login called");

    if (!supabase) {
      console.error("[useAuth] Login failed: Supabase client not available");
      return false;
    }

    try {
      // Use dummy email format as per project convention
      const email = `${username}@etire-system.local`;

      const { error } = await supabase.auth.signInWithPassword({
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
    if (!supabase) {
      console.error("[useAuth] Logout failed: Supabase client not available");
      setUser(null);
      setIsLoading(false);
      router.push("/login");
      return;
    }

    setIsLoading(true);
    try {
      await supabase.auth.signOut();
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