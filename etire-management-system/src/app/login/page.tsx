"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Car } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFormFieldPersistence } from '@/hooks/useFormPersistence';

export default function LoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user } = useAuth();

  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
  }, [searchParams, toast, router]);

  // Load saved password
  useEffect(() => {
    const savedPassword = localStorage.getItem('etire_saved_password');
    if (savedPassword) {
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

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
        if (rememberMe) {
          localStorage.setItem('etire_saved_password', password);
        } else {
          localStorage.removeItem('etire_saved_password');
        }

        toast({
          title: 'Welcome back!',
          description: 'Login successful. Redirecting...',
        });

        // Redirect based on role
        const role = user?.role;
        if (role === 'staff' || role === 'cashier') {
          router.push('/pos');
        } else {
          router.push('/dashboard');
        }
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
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-semibold">eTire System</span>
          </div>

          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Manage your tire shop with confidence.
          </h1>
          <p className="text-slate-400 text-lg">
            Inventory, sales, and analytics in one platform.
          </p>
        </div>

        <div className="text-sm text-slate-500">
          © 2026 eTire Management System
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-semibold">eTire System</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-2">Sign in</h2>
            <p className="text-muted-foreground">Enter your credentials to continue</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-11"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
                autoComplete="current-password"
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <Label htmlFor="remember" className="text-sm font-normal text-muted-foreground cursor-pointer">
                Remember me
              </Label>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground lg:hidden">
            © 2026 eTire Management System
          </p>
        </div>
      </div>
    </div>
  );
}