"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFormFieldPersistence } from '@/hooks/useFormPersistence';

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  // Redirect deferred until user state is populated by onAuthStateChange
  const [pendingRedirect, setPendingRedirect] = useState(false);

  const { value: username, setValue: setUsername } = useFormFieldPersistence('login-form', 'username', '');
  const [password, setPassword] = useState('');

  // Handle error params
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'missing_profile') {
      toast({
        title: 'Login Error',
        description: 'Your account profile could not be found. Please contact support.',
        variant: 'destructive',
        duration: 6000,
      });
      router.replace('/login');
    }
    if (error === 'session_superseded') {
      toast({
        title: 'Session Ended',
        description: 'Your session was ended because the account was logged in from another location.',
        variant: 'destructive',
        duration: 8000,
      });
      router.replace('/login');
    }
  }, [searchParams, toast, router]);

  // Clean up any previously stored plaintext passwords (security fix)
  useEffect(() => {
    localStorage.removeItem('etire_saved_password');
  }, []);

  // Fires once the auth state machinery has resolved the user profile after login.
  // Using a flag instead of reading user?.role inline prevents the race condition
  // where login() returns true but user is still null (onAuthStateChange is async).
  useEffect(() => {
    if (!pendingRedirect || !user) return;
    setPendingRedirect(false);
    const intended = sessionStorage.getItem('etire_intended_path');
    if (intended && intended.startsWith('/') && !intended.startsWith('//')) {
      sessionStorage.removeItem('etire_intended_path');
      router.push(intended);
    } else if (user.role === 'staff' || user.role === 'cashier') {
      router.push('/pos');
    } else {
      router.push('/dashboard');
    }
  }, [pendingRedirect, user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      toast({
        title: 'Missing Credentials',
        description: 'Username and password are required.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const success = await login(username, password);

      if (success) {
        toast({
          title: 'Welcome back!',
          description: 'Login successful. Redirecting...',
        });
        // Defer redirect until onAuthStateChange populates user state
        setPendingRedirect(true);
      } else {
        toast({
          title: 'Login Failed',
          description: 'Invalid username or password.',
          variant: 'destructive'
        });
      }
    } catch (error: unknown) {
      console.error("Login error:", error);
      const description =
        error instanceof Error ? error.message : "An unexpected error occurred.";
      toast({
        title: 'Login Error',
        description,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#f0ede8' }}
    >
      {/* Card */}
      <div
        className="w-full mx-4"
        style={{ maxWidth: '384px' }}
      >
        {/* Logo / Brand */}
        <div className="flex flex-col items-center mb-8">
          {/* Tire icon as SVG emblem */}
          <div
            className="flex items-center justify-center mb-4"
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #875A7B 0%, #5c2d5e 100%)',
              boxShadow: '0 4px 18px rgba(135,90,123,0.35)',
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 40 40"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer tire ring */}
              <circle cx="20" cy="20" r="18" stroke="white" strokeWidth="2.5" fill="none" />
              {/* Inner rim */}
              <circle cx="20" cy="20" r="9" stroke="white" strokeWidth="2" fill="none" />
              {/* Hub */}
              <circle cx="20" cy="20" r="3.5" fill="white" />
              {/* Spokes */}
              <line x1="20" y1="11" x2="20" y2="16.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="20" y1="23.5" x2="20" y2="29" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="11" y1="20" x2="16.5" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" />
              <line x1="23.5" y1="20" x2="29" y2="20" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#4a235a', letterSpacing: '-0.3px' }}
          >
            eTire Management
          </h1>
          <p className="text-sm mt-1" style={{ color: '#9e8da6' }}>
            Sign in to your account
          </p>
        </div>

        {/* Form Card */}
        <div
          className="bg-white rounded-2xl px-8 py-8"
          style={{
            boxShadow: '0 2px 20px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)',
          }}
        >
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#4a235a' }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                placeholder="e.g. john.doe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onFocus={() => setFocusedField('username')}
                onBlur={() => setFocusedField(null)}
                autoComplete="username"
                required
                style={{
                  display: 'block',
                  width: '100%',
                  height: '42px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: focusedField === 'username'
                    ? '1.5px solid #875A7B'
                    : '1.5px solid #d9d0dd',
                  outline: 'none',
                  fontSize: '14px',
                  color: '#2d1a38',
                  backgroundColor: '#fdfcfd',
                  boxShadow: focusedField === 'username'
                    ? '0 0 0 3px rgba(135,90,123,0.12)'
                    : 'none',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#4a235a' }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  autoComplete="current-password"
                  required
                  style={{
                    display: 'block',
                    width: '100%',
                    height: '42px',
                    padding: '0 40px 0 12px',
                    borderRadius: '8px',
                    border: focusedField === 'password'
                      ? '1.5px solid #875A7B'
                      : '1.5px solid #d9d0dd',
                    outline: 'none',
                    fontSize: '14px',
                    color: '#2d1a38',
                    backgroundColor: '#fdfcfd',
                    boxShadow: focusedField === 'password'
                      ? '0 0 0 3px rgba(135,90,123,0.12)'
                      : 'none',
                    transition: 'border-color 0.15s, box-shadow 0.15s',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  tabIndex={-1}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px',
                    color: '#875A7B',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 font-semibold text-sm text-white rounded-lg transition-all"
              style={{
                height: '42px',
                background: isLoading
                  ? '#b38ab8'
                  : 'linear-gradient(135deg, #875A7B 0%, #5c2d5e 100%)',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                boxShadow: isLoading
                  ? 'none'
                  : '0 2px 8px rgba(135,90,123,0.40)',
                letterSpacing: '0.01em',
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in…
                </>
              ) : (
                'Log in'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs" style={{ color: '#b0a3b8' }}>
          © 2026 eTire Management System
        </p>
      </div>
    </div>
  );
}