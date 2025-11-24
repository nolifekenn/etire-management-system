// /lib/tokenAuth.ts

// Custom types for authentication (not using Supabase Auth)
export interface CustomUser {
  user_id: string;
  name: string;
  username: string;
  role: number; // 0: Guest, 1: Staff, 2: Branch Manager, 3: Admin
}

export interface CustomSession {
  access_token: string;
  refresh_token?: string;
  expires_at: number; // Unix timestamp in seconds
  user: CustomUser;
}

// LocalStorage key for custom auth session
export const TOKEN_KEY = "etire_auth_session";
export const FORM_STATE_PREFIX = "etire_form_";

// ============================
// 🔐 AUTH SESSION MANAGEMENT
// ============================

// Save custom auth session to localStorage
export function saveAuthSession(session: CustomSession): void {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
  } catch (error) {
    console.error("Failed to save auth session:", error);
  }
}

// Retrieve custom auth session from localStorage
export function getAuthSession(): CustomSession | null {
  try {
    const sessionData = localStorage.getItem(TOKEN_KEY);
    if (!sessionData) return null;
    const parsed = JSON.parse(sessionData) as CustomSession;

    // Check expiration
    if (parsed.expires_at && parsed.expires_at * 1000 < Date.now()) {
      clearAuthSession();
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Failed to get auth session:", error);
    return null;
  }
}

// Clear auth session
export function clearAuthSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error("Failed to clear auth session:", error);
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const session = getAuthSession();
  return !!session && !!session.access_token;
}

// Get the current user from session
export function getCurrentUser(): CustomUser | null {
  const session = getAuthSession();
  return session?.user ?? null;
}

// ============================
// 🧾 FORM STATE MANAGEMENT
// ============================

export interface FormState {
  formId: string;
  data: Record<string, any>;
  timestamp: number;
}

// Save form state for recovery
export function saveFormState(formId: string, data: Record<string, any>): void {
  try {
    const formState: FormState = {
      formId,
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(`${FORM_STATE_PREFIX}${formId}`, JSON.stringify(formState));
  } catch (error) {
    console.error("Failed to save form state:", error);
  }
}

// Retrieve a saved form state
export function getFormState(formId: string): Record<string, any> | null {
  try {
    const formState = localStorage.getItem(`${FORM_STATE_PREFIX}${formId}`);
    if (!formState) return null;

    const parsed = JSON.parse(formState) as FormState;

    // Expire after 24 hours
    const maxAge = 24 * 60 * 60 * 1000;
    if (Date.now() - parsed.timestamp > maxAge) {
      clearFormState(formId);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error("Failed to get form state:", error);
    return null;
  }
}

export function clearFormState(formId: string): void {
  try {
    localStorage.removeItem(`${FORM_STATE_PREFIX}${formId}`);
  } catch (error) {
    console.error("Failed to clear form state:", error);
  }
}

export function clearAllFormStates(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.startsWith(FORM_STATE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error("Failed to clear form states:", error);
  }
}
