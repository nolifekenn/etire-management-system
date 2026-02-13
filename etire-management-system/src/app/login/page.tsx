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

<<<<<<< HEAD
      {/* Right Side - Forms (Fills remaining space) */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {isLogin ? (
            <Card key={formKey} className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600"></div>

              <form onSubmit={handleLogin}>
                <CardHeader className="space-y-1 pb-6 pt-10 px-10">
                  <CardTitle className="text-2xl font-bold text-slate-800 text-center">
                    USER LOGIN
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600 text-center">
                    Sign in to your eTire Manager account
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 px-10 pb-10">
                  <div className="space-y-4 animate-in fade-in duration-500 delay-300">
                    <div className="space-y-2">
                      <Label htmlFor="login-username" className="text-sm font-semibold text-slate-700">
                        Username
                      </Label>
                      <div className="relative">
                        <Input
                          id="login-username"
                          placeholder="Enter your username"
                          value={loginUsername}
                          onChange={(e) => setLoginUsername(e.target.value)}
                          className="h-12 pl-11 border-2 border-slate-200 transition-all duration-300 rounded-xl"
                          required
                        />
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-semibold text-slate-700">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="login-password"
                          type={showLoginPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="h-12 pl-11 pr-12 border-2 border-slate-200 transition-all duration-300 rounded-xl"
                          required
                          autoComplete="off"
                        />
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-500 hover:text-purple-600 transition-colors"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                        >
                          {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between animate-in fade-in duration-500 delay-400">
                    <div className="flex items-center space-x-2">
                      <CustomCheckbox
                        id="remember-me"
                        checked={rememberMe}
                        onCheckedChange={setRememberMe}
                      />
                      <Label htmlFor="remember-me" className="text-sm text-slate-700 cursor-pointer">
                        Remember me
                      </Label>
                    </div>
                  </div>

                  <Button
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl animate-in fade-in duration-500 delay-500"
                    type="submit"
                    disabled={formLoading}
                  >
                    {formLoading ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        SIGNING IN...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-5 w-5" />
                        LOGIN
                      </>
                    )}
                  </Button>

                  <div className="text-center animate-in fade-in duration-500 delay-600">
                    <span className="text-sm text-slate-600">
                      Don't have an account?{' '}
                      <Button
                        type="button"
                        variant="link"
                        className="text-purple-600 hover:text-purple-700 p-0 h-auto font-semibold"
                        onClick={() => handleFormSwitch(false)}
                      >
                        Sign up
                      </Button>
                    </span>
                  </div>
                </CardContent>
              </form>
            </Card>
          ) : (
            // Registration Form
            <Card key={formKey} className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm rounded-3xl overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600"></div>
              <form onSubmit={handleRegister}>
                <CardHeader className="space-y-1 pb-4 pt-10 px-10">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-fit -ml-3 mb-2 text-slate-600 hover:text-purple-600 transition-colors animate-in fade-in duration-500"
                    onClick={() => handleFormSwitch(true)}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to login
                  </Button>
                  <CardTitle className="text-2xl font-bold text-slate-800 text-center">
                    CREATE ACCOUNT
                  </CardTitle>
                  <CardDescription className="text-sm text-slate-600 text-center">
                    Step {currentStep} of {totalSteps}
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-10 pb-10">
                  <StepProgress currentStep={currentStep} totalSteps={totalSteps} />
                  {registrationError && (
                    <Alert variant="destructive" className="rounded-xl animate-in fade-in duration-500 mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {registrationError}
                      </AlertDescription>
                    </Alert>
                  )}
                  <div className={(currentStep === 3 || currentStep === 4) ? "max-h-[316px] overflow-y-auto -mr-10 pr-8 -ml-2 pl-2 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent hover:scrollbar-thumb-slate-400 pb-4" : ""}>
                    {renderRegistrationStep()}
                  </div>
                  <div className={`flex gap-3 mt-8 ${currentStep === 1 ? 'justify-end' : 'justify-between'
                    }`}>
                    {currentStep > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={prevStep}
                        className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl px-6"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                    )}
                    {currentStep < totalSteps ? (
                      <Button
                        type="button"
                        onClick={nextStep}
                        disabled={!validateStep(currentStep)}
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl px-6 ml-auto"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 ml-auto"
                        type="submit"
                        disabled={formLoading || !acceptedTerms}
                      >
                        {formLoading ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            CREATING ACCOUNT...
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-5 w-5" />
                            CREATE ACCOUNT
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </form>
            </Card>
          )}

          <div className="w-full max-w-md mt-8">
            {/* Copyright */}
            <p className="text-[10px] text-center text-slate-400 mt-4">
              © 2025 eTire Manager. Designed for Queen.R Tire Supply.
            </p>
=======
      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-semibold">eTire System</span>
>>>>>>> c03110cc0793ebf079ffd322583886433148916e
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