"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// import { supabase } from '@/lib/supabaseClient'; // <--- Removed, not needed here anymore
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, LogIn, Eye, EyeOff, ArrowLeft, Car, Lock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription } from '@/components/ui/alert'; // Removed unused AlertTitle
import { useFormFieldPersistence } from '@/hooks/useFormPersistence';
import { CustomCheckbox } from '@/components/ui/custom-checkbox';
import { registerAction } from '@/lib/action'; // <--- NEW IMPORT

// Tire Loading Animation Component
const TireLoadingAnimation = ({ isLoading }: { isLoading: boolean }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-in zoom-in duration-300">
        <div className="relative w-24 h-24 mx-auto mb-6">
          {/* Tire Outer Ring */}
          <div className="absolute inset-0 border-8 border-gray-300 rounded-full animate-spin"></div>
          {/* Tire Gradient Ring */}
          <div className="absolute inset-2 border-6 border-transparent rounded-full bg-gradient-to-r from-purple-600 to-blue-600 animate-spin" style={{ animationDuration: '1.5s' }}></div>
          {/* Tire Inner Ring */}
          <div className="absolute inset-6 border-4 border-gray-200 rounded-full"></div>
          {/* Center Hub */}
          <div className="absolute inset-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center">
            <Car className="h-6 w-6 text-white" />
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-slate-800 mb-2 font-poppins">
          Signing You In
        </h3>
        
        <p className="text-slate-600 mb-4 font-poppins">
          Welcome to eTire Manager
        </p>
        
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

// Password Strength Indicator
const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const getStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  const strength = getStrength(password);
  const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];

  const requirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'One uppercase letter' },
    { met: /[a-z]/.test(password), text: 'One lowercase letter' },
    { met: /[0-9]/.test(password), text: 'One number' },
    { met: /[^A-Za-z0-9]/.test(password), text: 'One special character' },
  ];

  return (
    <div className="space-y-3 mt-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700">Password Strength</span>
        <span className={`text-sm font-semibold ${
          strength === 0 ? 'text-red-600' :
          strength === 1 ? 'text-orange-600' :
          strength === 2 ? 'text-yellow-600' :
          strength === 3 ? 'text-blue-600' : 'text-green-600'
        }`}>
          {strengthLabels[strength]}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${
            strengthColors[strength] || 'bg-red-500'
          }`}
          style={{ width: `${(strength / 5) * 100}%` }}
        />
      </div>

      <div className="space-y-2">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2">
            {req.met ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <XCircle className="h-4 w-4 text-gray-400" />
            )}
            <span className={`text-sm ${req.met ? 'text-green-600' : 'text-gray-500'}`}>
              {req.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Terms and Conditions Dialog
const TermsAndConditionsDialog = ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Terms and Conditions</h2>
        </div>
        
        <div className="p-6 space-y-4 text-sm text-gray-700">
          <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
          
          <section>
            <h3 className="text-lg font-semibold mb-2">1. Acceptance of Terms</h3>
            <p>By accessing and using eTire Manager, you accept and agree to be bound by the terms and provision of this agreement.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">2. Use License</h3>
            <p>Permission is granted to temporarily use eTire Manager for personal and business purposes. This is the grant of a license, not a transfer of title.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">3. Account Registration</h3>
            <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the security of your account and password.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">4. Data Privacy</h3>
            <p>We collect and use personal data in accordance with our Privacy Policy. By using our services, you agree to the collection and use of information.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">5. Service Modifications</h3>
            <p>We reserve the right to modify or discontinue, temporarily or permanently, the service with or without notice.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">6. Limitation of Liability</h3>
            <p>eTire Manager shall not be liable for any indirect, incidental, special, consequential or punitive damages resulting from your use of the service.</p>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-2">7. Governing Law</h3>
            <p>These terms shall be governed by and construed in accordance with the laws of the Philippines, without regard to its conflict of law provisions.</p>
          </section>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Close
          </Button>
          <Button 
            onClick={() => onOpenChange(false)}
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            I Understand
          </Button>
        </div>
      </div>
    </div>
  );
};

export default function LoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Login State with persistence
    const { value: loginUsername, setValue: setLoginUsername } = useFormFieldPersistence('login-form', 'username', '');
    const { value: loginPassword, setValue: setLoginPassword } = useFormFieldPersistence('login-form', 'password', '');
    
    // Register State with persistence
    const { value: firstName, setValue: setFirstName } = useFormFieldPersistence('register-form', 'firstName', '');
    const { value: lastName, setValue: setLastName } = useFormFieldPersistence('register-form', 'lastName', '');
    const { value: registerUsername, setValue: setRegisterUsername } = useFormFieldPersistence('register-form', 'username', '');
    const { value: registerPassword, setValue: setRegisterPassword } = useFormFieldPersistence('register-form', 'password', '');
    const { value: confirmPassword, setValue: setConfirmPassword } = useFormFieldPersistence('register-form', 'confirmPassword', '');
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [registrationError, setRegistrationError] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    
    // Password visibility states
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Form animation state
    const [formKey, setFormKey] = useState(0);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        setRegistrationError(null);

        if (!loginUsername || !loginPassword) {
            toast({ title: 'Error', description: 'Username and password are required.', variant: 'destructive' });
            setFormLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            const success = await login(loginUsername, loginPassword);
            if (success) {
                toast({ title: 'Success', description: 'Logged in successfully!' });
                // The tire loading animation will show while isLoading is true
                setTimeout(() => {
                    router.push('/dashboard');
                }, 2000);
            } else {
                toast({ title: 'Login Failed', description: 'Invalid username or password.', variant: 'destructive' });
                setIsLoading(false);
            }
        } catch (error: any) {
            toast({ title: 'Login Error', description: error.message, variant: 'destructive' });
            setIsLoading(false);
        } finally {
            setFormLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegistrationError(null);

        if (!acceptedTerms) {
            toast({ title: 'Error', description: 'You must accept the Terms and Conditions.', variant: 'destructive' });
            return;
        }

        if (registerPassword !== confirmPassword) {
            toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
            return;
        }

        // Check password strength
        const strength = getPasswordStrength(registerPassword);
        if (strength < 3) {
            toast({ title: 'Weak Password', description: 'Please choose a stronger password.', variant: 'destructive' });
            return;
        }

        if (!firstName || !lastName || !registerUsername || !registerPassword) {
            toast({ title: 'Error', description: 'All fields are required.', variant: 'destructive' });
            return;
        }

        setFormLoading(true);

        try {
            // 🟢 REPLACED: OLD FETCH WITH NEW SERVER ACTION
            const result = await registerAction({
                firstName,
                lastName,
                username: registerUsername,
                password: registerPassword,
            });

            if (!result.success) {
                throw new Error(result.message || "Registration failed");
            }

            toast({ title: "Success", description: "Registration successful! Please log in." });

            // Reset and switch to login
            setIsLogin(true);
            setFirstName("");
            setLastName("");
            setRegisterUsername("");
            setRegisterPassword("");
            setConfirmPassword("");
            setAcceptedTerms(false);
            setFormKey(prev => prev + 1);

        } catch (error: any) {
            toast({
                title: "Registration Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setFormLoading(false);
        }
    };

    const getPasswordStrength = (password: string) => {
        let score = 0;
        if (password.length >= 8) score++;
        if (/[A-Z]/.test(password)) score++;
        if (/[a-z]/.test(password)) score++;
        if (/[0-9]/.test(password)) score++;
        if (/[^A-Za-z0-9]/.test(password)) score++;
        return score;
    };

    const handleFormSwitch = (toLogin: boolean) => {
        setIsLogin(toLogin);
        setFormKey(prev => prev + 1);
    };

    return (
        <div className="min-h-screen flex relative overflow-hidden font-poppins bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Tire Loading Animation */}
            <TireLoadingAnimation isLoading={isLoading} />

            {/* Terms and Conditions Dialog */}
            <TermsAndConditionsDialog open={showTerms} onOpenChange={setShowTerms} />

            {/* Main Content - Centered */}
            <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-4xl flex flex-col lg:flex-row items-center justify-between gap-8">
                    
                    {/* Left Side - Brand & Welcome */}
                    <div className={`flex-1 text-center lg:text-left transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
                        <div className="space-y-8">
                            {/* Logo & Brand */}
                            <div className="space-y-6">
                                <div className="flex items-center justify-center lg:justify-start gap-4 animate-in slide-in-from-left duration-700">
                                    <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-lg">
                                        <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-3 rounded-xl">
                                            <Car className="h-8 w-8 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <h1 className="text-4xl lg:text-5xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent animate-in fade-in duration-1000">
                                            eTire Manager
                                        </h1>
                                        <p className="text-lg text-slate-600 mt-2 font-light animate-in fade-in duration-1000 delay-300">
                                            Queen.R Tire Supply
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="space-y-4 animate-in fade-in duration-1000 delay-500">
                                    <h2 className="text-3xl font-bold text-slate-800">
                                        Welcome to eTire Manager
                                    </h2>
                                    <p className="text-lg text-slate-600 leading-relaxed max-w-md mx-auto lg:mx-0">
                                        Professional tire and automotive service management platform designed for Queen.R Tire Supply. 
                                        Streamline your operations and grow your business.
                                    </p>
                                </div>
                            </div>

                            {/* Security Badge */}
                            <div className="animate-in fade-in duration-1000 delay-700">
                                <div className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl px-6 py-4 shadow-lg">
                                    <div className="bg-green-100 p-2 rounded-full">
                                        <Lock className="h-6 w-6 text-green-600" />
                                    </div>
                                    <div className="text-left">
                                        <p className="font-semibold text-slate-800">Secure Login</p>
                                        <p className="text-sm text-slate-600">Your data is protected with enterprise-grade security</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Form */}
                    <div className={`flex-1 max-w-md w-full transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <Card key={formKey} className="border-0 shadow-2xl bg-white rounded-2xl overflow-hidden relative">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600"></div>
                            
                            {isLogin ? (
                                // Login Form
                                <form onSubmit={handleLogin}>
                                    <CardHeader className="space-y-1 pb-6 pt-8 px-8">
                                        <CardTitle className="text-2xl font-bold text-slate-800 text-center">
                                            USER LOGIN
                                        </CardTitle>
                                        <CardDescription className="text-sm text-slate-600 text-center">
                                            Sign in to your eTire Manager account
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6 px-8 pb-8">
                                        <div className="space-y-4 animate-in fade-in duration-500 delay-300">
                                            <div className="space-y-2">
                                                <Label htmlFor="login-username" className="text-sm font-semibold text-slate-700">
                                                    Username
                                                </Label>
                                                <Input 
                                                    id="login-username" 
                                                    placeholder="Enter your username"
                                                    value={loginUsername} 
                                                    onChange={(e) => setLoginUsername(e.target.value)}
                                                    className="h-12 border-2 border-slate-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
                                                    required 
                                                />
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
                                                        className="h-12 pr-12 border-2 border-slate-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
                                                        required 
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-500 hover:text-purple-600 transition-colors"
                                                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                                                    >
                                                        {showLoginPassword ? (
                                                            <EyeOff className="h-5 w-5" />
                                                        ) : (
                                                            <Eye className="h-5 w-5" />
                                                        )}
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
                                            <Button
                                                type="button"
                                                variant="link"
                                                className="text-sm text-purple-600 hover:text-purple-700 p-0 h-auto font-semibold"
                                            >
                                                Forgot password?
                                            </Button>
                                        </div>

                                        <Button 
                                            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl animate-in fade-in duration-500 delay-500" 
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
                            ) : (
                                // Register Form
                                <form onSubmit={handleRegister}>
                                    <CardHeader className="space-y-1 pb-6 pt-8 px-8">
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
                                            Join eTire Manager today
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 px-8 pb-8">
                                        {registrationError && (
                                            <Alert variant="destructive" className="rounded-xl animate-in fade-in duration-500">
                                                <AlertCircle className="h-4 w-4" />
                                                <AlertDescription>
                                                    {registrationError}
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                        <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500 delay-200">
                                            <div className="space-y-2">
                                                <Label htmlFor="first-name" className="text-sm font-semibold text-slate-700">
                                                    First Name
                                                </Label>
                                                <Input 
                                                    id="first-name" 
                                                    placeholder="John"
                                                    value={firstName} 
                                                    onChange={(e) => setFirstName(e.target.value)}
                                                    className="h-11 border-2 border-slate-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
                                                    required 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="last-name" className="text-sm font-semibold text-slate-700">
                                                    Last Name
                                                </Label>
                                                <Input 
                                                    id="last-name" 
                                                    placeholder="Doe"
                                                    value={lastName} 
                                                    onChange={(e) => setLastName(e.target.value)}
                                                    className="h-11 border-2 border-slate-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
                                                    required 
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2 animate-in fade-in duration-500 delay-300">
                                            <Label htmlFor="register-username" className="text-sm font-semibold text-slate-700">
                                                Username
                                            </Label>
                                            <Input 
                                                id="register-username" 
                                                placeholder="Choose a unique username"
                                                value={registerUsername} 
                                                onChange={(e) => setRegisterUsername(e.target.value)}
                                                className="h-11 border-2 border-slate-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
                                                required 
                                            />
                                        </div>
                                        <div className="space-y-2 animate-in fade-in duration-500 delay-400">
                                            <Label htmlFor="register-password" className="text-sm font-semibold text-slate-700">
                                                Password
                                            </Label>
                                            <div className="relative">
                                                <Input 
                                                    id="register-password" 
                                                    type={showRegisterPassword ? "text" : "password"}
                                                    placeholder="Create a strong password"
                                                    value={registerPassword} 
                                                    onChange={(e) => setRegisterPassword(e.target.value)}
                                                    className="h-11 pr-12 border-2 border-slate-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
                                                    required 
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-500 hover:text-purple-600 transition-colors"
                                                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                                >
                                                    {showRegisterPassword ? (
                                                        <EyeOff className="h-5 w-5" />
                                                    ) : (
                                                        <Eye className="h-5 w-5" />
                                                    )}
                                                </Button>
                                            </div>
                                            <PasswordStrengthIndicator password={registerPassword} />
                                        </div>
                                        <div className="space-y-2 animate-in fade-in duration-500 delay-500">
                                            <Label htmlFor="confirm-password" className="text-sm font-semibold text-slate-700">
                                                Confirm Password
                                            </Label>
                                            <div className="relative">
                                                <Input 
                                                    id="confirm-password" 
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    placeholder="Re-enter your password"
                                                    value={confirmPassword} 
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="h-11 pr-12 border-2 border-slate-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
                                                    required 
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-500 hover:text-purple-600 transition-colors"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                >
                                                    {showConfirmPassword ? (
                                                        <EyeOff className="h-5 w-5" />
                                                    ) : (
                                                        <Eye className="h-5 w-5" />
                                                    )}
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-3 animate-in fade-in duration-500 delay-600">
                                            <div className="flex items-center space-x-2">
                                                <CustomCheckbox 
                                                    id="terms" 
                                                    checked={acceptedTerms}
                                                    onCheckedChange={setAcceptedTerms}
                                                />
                                                <Label htmlFor="terms" className="text-sm text-slate-700 cursor-pointer">
                                                    I agree to the{' '}
                                                    <Button
                                                        type="button"
                                                        variant="link"
                                                        className="text-purple-600 hover:text-purple-700 p-0 h-auto font-semibold"
                                                        onClick={() => setShowTerms(true)}
                                                    >
                                                        Terms and Conditions
                                                    </Button>
                                                </Label>
                                            </div>
                                        </div>

                                        <Button 
                                            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl mt-4 animate-in fade-in duration-500 delay-700" 
                                            type="submit" 
                                            disabled={formLoading || !acceptedTerms}
                                        >
                                            {formLoading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                    CREATING ACCOUNT...
                                                </>
                                            ) : (
                                                <>
                                                    <UserPlus className="mr-2 h-5 w-5" />
                                                    CREATE ACCOUNT
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                </form>
                            )}
                        </Card>

                        <p className="text-center text-sm text-slate-600 mt-6">
                            © 2024 eTire Manager. Designed for Queen.R Tire Supply.
                        </p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
                
                .font-poppins {
                    font-family: 'Poppins', sans-serif;
                }

                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }

                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}