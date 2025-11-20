"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, LogIn, Eye, EyeOff, ArrowLeft, Car, Lock, CheckCircle, XCircle, AlertCircle, ChevronRight, ChevronLeft, User, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFormFieldPersistence } from '@/hooks/useFormPersistence';
import { CustomCheckbox } from '@/components/ui/custom-checkbox';

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

// Enhanced Password Strength Indicator with Red to Green
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
  
  // Color mapping from red to green
  const getStrengthColor = (score: number) => {
    switch(score) {
      case 0: return 'bg-red-500';
      case 1: return 'bg-red-400';
      case 2: return 'bg-orange-400';
      case 3: return 'bg-yellow-400';
      case 4: return 'bg-green-400';
      case 5: return 'bg-green-500';
      default: return 'bg-red-500';
    }
  };

  const getStrengthLabel = (score: number) => {
    switch(score) {
      case 0: return 'Very Weak';
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      case 5: return 'Very Strong';
      default: return 'Very Weak';
    }
  };

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
          strength <= 1 ? 'text-red-600' :
          strength === 2 ? 'text-orange-600' :
          strength === 3 ? 'text-yellow-600' :
          strength >= 4 ? 'text-green-600' : 'text-red-600'
        }`}>
          {getStrengthLabel(strength)}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${getStrengthColor(strength)}`}
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

// Step Progress Indicator - FIXED ALIGNMENT
const StepProgress = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  return (
    <div className="flex items-center justify-between mb-8 px-2">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div key={index} className="flex items-center flex-1 last:flex-none">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
            index + 1 <= currentStep 
              ? 'bg-purple-600 border-purple-600 text-white' 
              : 'border-gray-300 text-gray-500'
          } font-semibold text-sm transition-all duration-300`}>
            {index + 1}
          </div>
          {index < totalSteps - 1 && (
            <div className={`flex-1 h-1 mx-2 ${
              index + 1 < currentStep ? 'bg-purple-600' : 'bg-gray-300'
            } transition-all duration-300`} />
          )}
        </div>
      ))}
    </div>
  );
};

// Success Confirmation Component
const SuccessConfirmation = ({ 
  isOpen, 
  onClose, 
  type,
  userData 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  type: 'login' | 'register';
  userData?: { firstName: string; lastName: string; username: string };
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full mx-auto animate-in zoom-in duration-300">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {type === 'register' ? 'Account Created Successfully!' : 'Welcome Back!'}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {type === 'register' 
              ? `Welcome to eTire Manager, ${userData?.firstName}! Your account has been created successfully.`
              : `You have successfully signed in to your eTire Manager account.`
            }
          </p>

          {type === 'register' && userData && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-800 mb-2">Account Details:</h3>
              <div className="space-y-1 text-sm text-gray-600">
                <p><span className="font-medium">Name:</span> {userData.firstName} {userData.lastName}</p>
                <p><span className="font-medium">Username:</span> {userData.username}</p>
                <p><span className="font-medium">Status:</span> Active</p>
              </div>
            </div>
          )}

          <Button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
          >
            {type === 'register' ? 'Continue to Login' : 'Go to Dashboard'}
          </Button>
        </div>
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

    // Multi-step registration state
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 4;

    // Success confirmation state
    const [showSuccess, setShowSuccess] = useState(false);
    const [successType, setSuccessType] = useState<'login' | 'register'>('login');
    const [successUserData, setSuccessUserData] = useState<{ firstName: string; lastName: string; username: string } | null>(null);

    // Login State with persistence
    const { value: loginUsername, setValue: setLoginUsername } = useFormFieldPersistence('login-form', 'username', '');
    const { value: loginPassword, setValue: setLoginPassword } = useFormFieldPersistence('login-form', 'password', '');
    
    // Register State with persistence
    const { value: firstName, setValue: setFirstName } = useFormFieldPersistence('register-form', 'firstName', '');
    const { value: lastName, setValue: setLastName } = useFormFieldPersistence('register-form', 'lastName', '');
    const { value: email, setValue: setEmail } = useFormFieldPersistence('register-form', 'email', '');
    const { value: phone, setValue: setPhone } = useFormFieldPersistence('register-form', 'phone', '');
    const { value: address, setValue: setAddress } = useFormFieldPersistence('register-form', 'address', '');
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
                // Show success confirmation
                setSuccessType('login');
                setShowSuccess(true);
                
                // Redirect after confirmation
                setTimeout(() => {
                    router.push('/dashboard');
                }, 3000);
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
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "register",
                    firstName,
                    lastName,
                    email,
                    phone,
                    address,
                    username: registerUsername,
                    password: registerPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Registration failed");
            }

            // Store user data for success confirmation
            setSuccessUserData({ firstName, lastName, username: registerUsername });
            setSuccessType('register');
            setShowSuccess(true);

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

    const handleSuccessClose = () => {
        setShowSuccess(false);
        if (successType === 'register') {
            // Reset and switch to login after successful registration
            setIsLogin(true);
            setCurrentStep(1);
            setFirstName("");
            setLastName("");
            setEmail("");
            setPhone("");
            setAddress("");
            setRegisterUsername("");
            setRegisterPassword("");
            setConfirmPassword("");
            setAcceptedTerms(false);
            setSuccessUserData(null);
        } else {
            // For login, just proceed to dashboard
            router.push('/dashboard');
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
        setCurrentStep(1);
        setFormKey(prev => prev + 1);
    };

    const nextStep = () => {
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Step validation
    const validateStep = (step: number) => {
        switch(step) {
            case 1:
                return firstName.trim() && lastName.trim();
            case 2:
                return email.trim() && phone.trim();
            case 3:
                return registerUsername.trim() && registerPassword.trim() && confirmPassword.trim();
            case 4:
                return acceptedTerms;
            default:
                return false;
        }
    };

    const renderRegistrationStep = () => {
        switch(currentStep) {
            case 1:
                return (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="text-center mb-6">
                            <User className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-800">Personal Information</h3>
                            <p className="text-slate-600">Tell us about yourself</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="first-name" className="text-sm font-semibold text-slate-700">
                                    First Name *
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
                                    Last Name *
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
                    </div>
                );
            
            case 2:
                return (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="text-center mb-6">
                            <Mail className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-800">Contact Details</h3>
                            <p className="text-slate-600">How can we reach you?</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-semibold text-slate-700">
                                    Email Address *
                                </Label>
                                <Input 
                                    id="email" 
                                    type="email"
                                    placeholder="john.doe@example.com"
                                    value={email} 
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="h-11 border-2 border-slate-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
                                    required 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-semibold text-slate-700">
                                    Phone Number *
                                </Label>
                                <Input 
                                    id="phone" 
                                    type="tel"
                                    placeholder="+1 (555) 123-4567"
                                    value={phone} 
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="h-11 border-2 border-slate-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
                                    required 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="address" className="text-sm font-semibold text-slate-700">
                                    Address
                                </Label>
                                <Input 
                                    id="address" 
                                    placeholder="123 Main Street, City, State"
                                    value={address} 
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="h-11 border-2 border-slate-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
                                />
                            </div>
                        </div>
                    </div>
                );
            
            case 3:
                return (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="text-center mb-6">
                            <Lock className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-800">Account Security</h3>
                            <p className="text-slate-600">Create your login credentials</p>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="register-username" className="text-sm font-semibold text-slate-700">
                                    Username *
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
                            <div className="space-y-2">
                                <Label htmlFor="register-password" className="text-sm font-semibold text-slate-700">
                                    Password *
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
                            <div className="space-y-2">
                                <Label htmlFor="confirm-password" className="text-sm font-semibold text-slate-700">
                                    Confirm Password *
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
                        </div>
                    </div>
                );
            
            case 4:
                return (
                    <div className="space-y-4 animate-in fade-in duration-500">
                        <div className="text-center mb-6">
                            <CheckCircle className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-slate-800">Review & Agreement</h3>
                            <p className="text-slate-600">Almost done! Review your information</p>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 space-y-3 mb-4">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Name:</span>
                                <span className="font-semibold">{firstName} {lastName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Email:</span>
                                <span className="font-semibold">{email}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Phone:</span>
                                <span className="font-semibold">{phone}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-600">Username:</span>
                                <span className="font-semibold">{registerUsername}</span>
                            </div>
                        </div>

                        <div className="space-y-3">
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
                    </div>
                );
            
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen flex relative overflow-hidden font-poppins bg-white">
            {/* Tire Loading Animation */}
            <TireLoadingAnimation isLoading={isLoading} />

            {/* Success Confirmation Dialog */}
            <SuccessConfirmation 
                isOpen={showSuccess} 
                onClose={handleSuccessClose}
                type={successType}
                userData={successUserData || undefined}
            />

            {/* Terms and Conditions Dialog */}
            <TermsAndConditionsDialog open={showTerms} onOpenChange={setShowTerms} />

            {/* Left Side - Your Image */}
            <div className="hidden lg:flex flex-1 items-center justify-center bg-white p-8">
                <div className="relative w-full h-full flex items-center justify-center">
                    <img 
                        src="/images/Auto.png" 
                        alt="eTire Manager"
                        className="max-w-full max-h-[80vh] w-auto h-auto object-contain rounded-2xl"
                    />
                </div>
            </div>

            {/* Right Side - Forms */}
            <div className="flex-1 flex items-center justify-center p-6 bg-white">
                <div className="w-full max-w-md">
                    {isLogin ? (
                        // Login Form
                        <Card key={formKey} className="border-0 shadow-xl bg-white rounded-2xl overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600"></div>
                            
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
                        </Card>
                    ) : (
                        // Registration Form with Steps
                        <Card key={formKey} className="border-0 shadow-xl bg-white rounded-2xl overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600"></div>
                            
                            <form onSubmit={handleRegister}>
                                <CardHeader className="space-y-1 pb-4 pt-8 px-8">
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

                                <CardContent className="px-8 pb-8">
                                    {/* Step Progress - FIXED ALIGNMENT */}
                                    <StepProgress currentStep={currentStep} totalSteps={totalSteps} />

                                    {registrationError && (
                                        <Alert variant="destructive" className="rounded-xl animate-in fade-in duration-500 mb-4">
                                            <AlertCircle className="h-4 w-4" />
                                            <AlertDescription>
                                                {registrationError}
                                            </AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Step Content */}
                                    {renderRegistrationStep()}

                                    {/* Navigation Buttons */}
                                    <div className={`flex gap-3 mt-8 ${
                                        currentStep === 1 ? 'justify-end' : 'justify-between'
                                    }`}>
                                        {currentStep > 1 && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={prevStep}
                                                className="flex items-center gap-2 border-slate-300 text-slate-700 hover:bg-slate-50 rounded-xl"
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
                                                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-xl ml-auto"
                                            >
                                                Next
                                                <ChevronRight className="h-4 w-4" />
                                            </Button>
                                        ) : (
                                            <Button 
                                                className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl ml-auto" 
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

                    {/* Updated year to 2025 */}
                    <p className="text-center text-sm text-slate-600 mt-6">
                        © 2025 eTire Manager. Designed for Queen.R Tire Supply.
                    </p>
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