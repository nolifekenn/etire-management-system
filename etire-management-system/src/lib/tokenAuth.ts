// Token-based authentication utilities
export interface AuthToken {
  token: string;
  user: {
    user_id: string;
    name: string;
    username: string;
    role: number;
  };
  expiresAt: number;
}

export interface FormState {
  formId: string;
  data: Record<string, any>;
  timestamp: number;
}

// Token management
export const TOKEN_KEY = 'etire_auth_token';
export const FORM_STATE_PREFIX = 'etire_form_';

// Generate a secure token
export function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Save authentication token to localStorage
export function saveAuthToken(tokenData: AuthToken): void {
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokenData));
  } catch (error) {
    console.error('Failed to save auth token:', error);
  }
}

// Get authentication token from localStorage
export function getAuthToken(): AuthToken | null {
  try {
    const tokenData = localStorage.getItem(TOKEN_KEY);
    if (!tokenData) return null;
    
    const parsed = JSON.parse(tokenData) as AuthToken;
    
    // Check if token is expired
    if (Date.now() > parsed.expiresAt) {
      clearAuthToken();
      return null;
    }
    
    return parsed;
  } catch (error) {
    console.error('Failed to get auth token:', error);
    clearAuthToken();
    return null;
  }
}

// Clear authentication token
export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch (error) {
    console.error('Failed to clear auth token:', error);
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  const token = getAuthToken();
  return token !== null;
}

// Get current user from token
export function getCurrentUser() {
  const token = getAuthToken();
  return token?.user || null;
}

// Form state management
export function saveFormState(formId: string, data: Record<string, any>): void {
  try {
    const formState: FormState = {
      formId,
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(`${FORM_STATE_PREFIX}${formId}`, JSON.stringify(formState));
  } catch (error) {
    console.error('Failed to save form state:', error);
  }
}

export function getFormState(formId: string): Record<string, any> | null {
  try {
    const formState = localStorage.getItem(`${FORM_STATE_PREFIX}${formId}`);
    if (!formState) return null;
    
    const parsed = JSON.parse(formState) as FormState;
    
    // Check if form state is too old (24 hours)
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    if (Date.now() - parsed.timestamp > maxAge) {
      clearFormState(formId);
      return null;
    }
    
    return parsed.data;
  } catch (error) {
    console.error('Failed to get form state:', error);
    return null;
  }
}

export function clearFormState(formId: string): void {
  try {
    localStorage.removeItem(`${FORM_STATE_PREFIX}${formId}`);
  } catch (error) {
    console.error('Failed to clear form state:', error);
  }
}

export function clearAllFormStates(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(FORM_STATE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Failed to clear form states:', error);
  }
}

// Create auth token from user data
export function createAuthToken(user: any): AuthToken {
  return {
    token: generateToken(),
    user: {
      user_id: user.user_id,
      name: user.name,
      username: user.username,
      role: user.role
    },
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
  };
}
