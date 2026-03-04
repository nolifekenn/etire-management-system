"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/types";

interface ExtendedUser {
  user_id: string;
  name: string;
  username: string;
  role: UserRole;
  branch_id?: string;
}

interface AuthContextType {
  user: ExtendedUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  activeBranchId: string | null;
  setActiveBranchId: (id: string | null) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => false,
  logout: () => { },
  activeBranchId: null,
  setActiveBranchId: () => { },
  refreshUser: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [activeBranchId, setActiveBranchIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const safetyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const setActiveBranchId = (id: string | null) => {
    setActiveBranchIdState(id);
    if (user?.role === 'super_admin') {
      if (id) {
        localStorage.setItem('etire_active_branch', id);
      } else {
        localStorage.removeItem('etire_active_branch');
      }
    }
  };

  useEffect(() => {
    let mounted = true;
    let hasInitialized = false;

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

    // Fetch user profile with timeout and retry
    const fetchUserProfile = async (authUserId: string): Promise<ExtendedUser | null> => {
      console.log("[useAuth] fetchUserProfile called with authUserId:", authUserId);

      // Small delay to let session fully sync
      await new Promise(resolve => setTimeout(resolve, 200));

      const fetchWithTimeout = async (attempt: number): Promise<ExtendedUser | null> => {
        const timeoutMs = attempt === 1 ? 5000 : 3000; // Shorter timeout on retry

        const timeout = new Promise<null>((resolve) => {
          setTimeout(() => {
            console.warn(`[useAuth] Profile query attempt ${attempt} timed out after ${timeoutMs}ms`);
            resolve(null);
          }, timeoutMs);
        });

        const query = (async (): Promise<ExtendedUser | null> => {
          try {
            console.log(`[useAuth] Attempt ${attempt}: Querying user table...`);

            // First try with deleted_at filter
            let result = await supabase
              .from("user")
              .select("user_id, name, username, role, branch_id")
              .eq("auth_id", authUserId)
              .is("deleted_at", null)
              .maybeSingle();

            // If no result, try without deleted_at filter as fallback
            if (!result.data && !result.error) {
              console.log("[useAuth] No result with deleted_at filter, trying without...");
              result = await supabase
                .from("user")
                .select("user_id, name, username, role, branch_id")
                .eq("auth_id", authUserId)
                .maybeSingle();
            }

            if (result.data && !result.error) {
              console.log("[useAuth] Profile found:", result.data.username);
              return result.data as ExtendedUser;
            } else if (result.error) {
              console.error("[useAuth] Profile query error:", result.error.message);
              return null;
            } else {
              console.warn("[useAuth] No profile found for auth_id:", authUserId);
              return null;
            }
          } catch (err) {
            console.error("[useAuth] Exception fetching user profile:", err);
            return null;
          }
        })();

        return Promise.race([query, timeout]);
      };

      // Try up to 2 times
      let profile = await fetchWithTimeout(1);
      if (!profile) {
        console.log("[useAuth] Retrying profile fetch...");
        profile = await fetchWithTimeout(2);
      }

      return profile;
    };

    const initializeAuth = async () => {
      try {
        // Check for a local session first — avoids AuthSessionMissingError spam when
        // getUser() is called with no cookies (Supabase internally logs the error before
        // returning it to our code). getSession() never throws when no session exists.
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          // No session at all — no need to hit the server
          if (mounted) {
            setUser(null);
            setIsLoading(false);
            hasInitialized = true;
            if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
          }
          return;
        }

        // Session exists locally — validate it server-side with getUser()
        const { data: { user: authUser }, error: userError } = await supabase.auth.getUser();

        if (userError) {
          // auth_session_missing is expected when no user is logged in — not a real error
          const code = (userError as { code?: string }).code;
          if (code !== 'auth_session_missing') {
            console.error("[useAuth] getUser error:", userError);
          }
        }

        if (authUser) {
          // user is verified by the server — load their profile
          const profile = await fetchUserProfile(authUser.id);
          if (mounted) {
            if (profile) {
              setUser(profile);

              // Initialize active branch
              if (profile.role === 'super_admin') {
                const savedBranch = localStorage.getItem('etire_active_branch');
                setActiveBranchIdState(savedBranch || profile.branch_id || null);
              } else {
                setActiveBranchIdState(profile.branch_id || null);
              }

            } else {
              await supabase.auth.signOut();
              setUser(null);
              router.push("/login?error=missing_profile");
            }
            setIsLoading(false);
            hasInitialized = true;
            if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
          }
        } else {
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
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
      }

      if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null);
          setActiveBranchIdState(null);
          localStorage.removeItem('etire_active_branch');
          setIsLoading(false);
          hasInitialized = true;
          router.push("/login");
        }
        return;
      }

      if (event === 'INITIAL_SESSION' && hasInitialized) return;

      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') && session?.user && mounted) {
        const profile = await fetchUserProfile(session.user.id);
        if (mounted) {
          if (profile) {
            setUser(profile);
            // Re-sync active branch on refresh/signin
            if (profile.role === 'super_admin') {
              const savedBranch = localStorage.getItem('etire_active_branch');
              setActiveBranchIdState(savedBranch || profile.branch_id || null);
            } else {
              setActiveBranchIdState(profile.branch_id || null);
            }
          }
          setIsLoading(false);
          hasInitialized = true;
        }
        return;
      }

      if (!session?.user && mounted) {
        setUser(null);
        setActiveBranchIdState(null);
        setIsLoading(false);
        hasInitialized = true;
      }
    });

    return () => {
      mounted = false;
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
      subscription.unsubscribe();
    };
  }, [router]);

  // ... login and logout (modified to clear local storage on logout) ...

  const login = async (username: string, password: string): Promise<boolean> => {
    if (!supabase) return false;

    try {
      const response = await fetch("/api/auth/verify-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        console.error("[useAuth] Credential verification failed:", payload?.message ?? response.statusText);
        return false;
      }

      const payload = await response.json().catch(() => null);
      const email = payload?.email as string | undefined;

      if (!email) {
        console.error("[useAuth] Credential verification response missing email.");
        return false;
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        console.error("[useAuth] Supabase sign-in failed:", error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.error("[useAuth] Unexpected login error:", err);
      return false;
    }
  };

  const refreshUser = async (): Promise<void> => {
    if (!supabase) return;
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      let result = await supabase
        .from("user")
        .select("user_id, name, username, role, branch_id")
        .eq("auth_id", authUser.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (!result.data && !result.error) {
        result = await supabase
          .from("user")
          .select("user_id, name, username, role, branch_id")
          .eq("auth_id", authUser.id)
          .maybeSingle();
      }

      if (result.data && !result.error) {
        const profile = result.data as ExtendedUser;
        setUser(profile);
        if (profile.role === 'super_admin') {
          const savedBranch = localStorage.getItem('etire_active_branch');
          setActiveBranchIdState(savedBranch || profile.branch_id || null);
        } else {
          setActiveBranchIdState(profile.branch_id || null);
        }
      }
    } catch (err) {
      console.error("[useAuth] refreshUser error:", err);
    }
  };

  const logout = async () => {
    // Clear state immediately so the UI reflects the logged-out state right away.
    // The SIGNED_OUT event from onAuthStateChange will fire shortly after and
    // also call router.push('/login') as a fallback.
    setUser(null);
    setActiveBranchIdState(null);
    localStorage.removeItem('etire_active_branch');
    router.push('/login');

    if (!supabase) return;
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, activeBranchId, setActiveBranchId, refreshUser }}>
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