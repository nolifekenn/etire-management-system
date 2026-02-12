"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2, UserPlus, LogIn, Eye, EyeOff, ArrowLeft, Car, Lock, CheckCircle,
  XCircle, AlertCircle, ChevronRight, ChevronLeft, User, Mail, Phone, MapPin,
  ArrowRight, Sparkles, Shield, PackageSearch, TrendingUp, Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFormFieldPersistence } from '@/hooks/useFormPersistence';
import { CustomCheckbox } from '@/components/ui/custom-checkbox';
import { registerAction } from "@/lib/auth-actions";
import { Dialog, DialogContent } from "@/components/ui/dialog";

// ===== ENHANCED SUCCESS ANIMATION COMPONENT =====
const SuccessAnimation = ({
  isVisible,
  title,
  message,
  actionType,
  userData,
  onConfirm,
  onAddAnother
}: {
  isVisible: boolean;
  title: string;
  message: string;
  actionType: 'login' | 'register';
  userData?: { firstName: string; lastName: string; username: string };
  onConfirm: () => void;
  onAddAnother?: () => void;
}) => {
  if (!isVisible) return null;

  const getActionConfig = () => {
    switch (actionType) {
      case 'register':
        return {
          gradient: 'from-purple-600 via-indigo-600 to-blue-600',
          icon: UserPlus,
          iconBg: 'bg-gradient-to-r from-purple-500/20 to-blue-500/20',
          buttonGradient: 'from-purple-600 to-indigo-600'
        };
      case 'login':
        return {
          gradient: 'from-green-500 via-emerald-600 to-teal-600',
          icon: LogIn,
          iconBg: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20',
          buttonGradient: 'from-green-600 to-emerald-600'
        };
      default:
        return {
          gradient: 'from-purple-600 to-indigo-600',
          icon: CheckCircle,
          iconBg: 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20',
          buttonGradient: 'from-purple-600 to-indigo-600'
        };
    }
  };

  const { gradient, icon: ActionIcon, iconBg, buttonGradient } = getActionConfig();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-in zoom-in duration-300">
        <div className={`relative w-20 h-20 bg-gradient-to-r ${gradient} rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500`}>
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/10 to-transparent animate-pulse"></div>
          <ActionIcon className="h-10 w-10 text-white relative z-10 animate-in scale-in duration-700 delay-300" />
          <div className="absolute inset-0 border-2 border-white/30 rounded-full animate-ping"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-white/20 rounded-full animate-spin"></div>
        </div>

        <div className="relative mb-6">
          <div className="w-16 h-16 mx-auto">
            <svg className="w-full h-full" viewBox="0 0 24 24">
              <path
                className="stroke-current text-green-500"
                fill="none"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20 6L9 17l-5-5"
              />
            </svg>
          </div>
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-2 font-poppins animate-in slide-in-from-top duration-500">
          {title}
        </h3>

        <p className="text-slate-600 mb-6 font-poppins animate-in fade-in duration-500 delay-200">
          {message}
        </p>

        {actionType === 'register' && userData && (
          <div className="w-full bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg p-4 border border-purple-100 mb-6 animate-in slide-in-from-left duration-500 delay-300">
            <div className="text-left space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Full Name:</span>
                <span className="text-sm font-semibold text-slate-900">{userData.firstName} {userData.lastName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Username:</span>
                <span className="text-sm font-semibold text-slate-900">{userData.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Status:</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  Active Account
                </span>
              </div>
            </div>
          </div>
        )}

        {actionType === 'login' && (
          <div className="grid grid-cols-2 gap-3 mb-6 animate-in fade-in duration-500 delay-300">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 rounded-lg border border-green-100">
              <div className="flex items-center gap-2 mb-1">
                <PackageSearch className="h-4 w-4 text-green-600" />
                <span className="text-xs font-medium text-green-800">Inventory</span>
              </div>
              <p className="text-xs text-green-600">Track all items</p>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-3 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-800">Analytics</span>
              </div>
              <p className="text-xs text-blue-600">View insights</p>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button
            className={`bg-gradient-to-r ${buttonGradient} hover:scale-105 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins animate-in slide-in-from-bottom duration-500 delay-400`}
            onClick={onConfirm}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            {actionType === 'register' ? 'Continue to Login' : 'Proceed'}
          </Button>

          {actionType === 'register' && onAddAnother && (
            <Button
              onClick={onAddAnother}
              variant="outline"
              className="animate-in fade-in duration-500 delay-500"
            >
              Create Another Account
            </Button>
          )}
        </div>

        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full animate-pulse"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${i * 0.2}s`,
                opacity: 0.7
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

// ===== ENHANCED LOADING ANIMATION =====
const EnhancedLoadingAnimation = ({
  isLoading,
  progress,
  message = "Signing you in"
}: {
  isLoading: boolean;
  progress: number;
  message?: string;
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-in zoom-in duration-300">
        <div className="relative w-32 h-32 mx-auto mb-8">
          <div className="absolute inset-0 border-[12px] border-gray-200 rounded-full"></div>
          <div
            className="absolute inset-3 border-[10px] border-transparent rounded-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 animate-spin"
            style={{ animationDuration: '2s' }}
          ></div>
          <div
            className="absolute inset-6 border-[8px] border-transparent rounded-full bg-gradient-to-r from-blue-600 to-cyan-600 animate-spin"
            style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
          ></div>
          <div className="absolute inset-10 bg-gradient-to-br from-white to-gray-100 rounded-full flex items-center justify-center shadow-inner">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full flex items-center justify-center">
              <Car className="h-6 w-6 text-white" />
            </div>
          </div>
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle
              cx="64"
              cy="64"
              r="58"
              fill="transparent"
              stroke="url(#progress-gradient)"
              strokeWidth="6"
              strokeDasharray={`${progress * 3.65} 365`}
              className="transition-all duration-300 ease-out"
            />
            <defs>
              <linearGradient id="progress-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8B5CF6" />
                <stop offset="50%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#10B981" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-3 font-poppins">
          {message}
        </h3>

        <p className="text-slate-600 mb-4 font-poppins animate-pulse">
          {progress < 25 && "Initializing session..."}
          {progress >= 25 && progress < 50 && "Verifying credentials..."}
          {progress >= 50 && progress < 75 && "Loading preferences..."}
          {progress >= 75 && progress < 100 && "Almost there..."}
          {progress === 100 && "Ready!"}
        </p>

        <div className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
          {Math.round(progress)}%
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
          <div
            className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0%</span>
          <span className="font-medium">Authenticating</span>
          <span>100%</span>
        </div>
      </div>
    </div>
  );
};

// ===== PASSWORD STRENGTH =====
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

  const getStrengthColor = (score: number) => {
    switch (score) {
      case 0: return 'from-red-500 to-red-400';
      case 1: return 'from-red-500 to-orange-400';
      case 2: return 'from-orange-500 to-yellow-400';
      case 3: return 'from-yellow-500 to-green-400';
      case 4: return 'from-green-500 to-emerald-400';
      case 5: return 'from-emerald-500 to-teal-400';
      default: return 'from-red-500 to-red-400';
    }
  };

  const getStrengthLabel = (score: number) => {
    switch (score) {
      case 0: return 'Very Weak';
      case 1: return 'Weak';
      case 2: return 'Fair';
      case 3: return 'Good';
      case 4: return 'Strong';
      case 5: return 'Very Strong';
      default: return 'Very Weak';
    }
  };

  const getStrengthIcon = (score: number) => {
    switch (score) {
      case 0: return <AlertCircle className="h-4 w-4" />;
      case 1: return <AlertCircle className="h-4 w-4" />;
      case 2: return <Shield className="h-4 w-4" />;
      case 3: return <Shield className="h-4 w-4" />;
      case 4: return <CheckCircle className="h-4 w-4" />;
      case 5: return <CheckCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  const requirements = [
    { met: password.length >= 8, text: 'At least 8 characters' },
    { met: /[A-Z]/.test(password), text: 'Uppercase letter' },
    { met: /[a-z]/.test(password), text: 'Lowercase letter' },
    { met: /[0-9]/.test(password), text: 'Number' },
    { met: /[^A-Za-z0-9]/.test(password), text: 'Special character' },
  ];

  return (
    <div className="space-y-4 mt-3">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          {getStrengthIcon(strength)}
          <span className="text-sm font-medium text-gray-700">Password Strength</span>
        </div>
        <span className={`text-sm font-semibold px-2 py-1 rounded-full ${strength <= 1 ? 'bg-red-100 text-red-700' :
            strength === 2 ? 'bg-orange-100 text-orange-700' :
              strength === 3 ? 'bg-yellow-100 text-yellow-700' :
                strength >= 4 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
          {getStrengthLabel(strength)}
        </span>
      </div>
      <div className="w-full bg-gradient-to-r from-gray-100 to-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-2 rounded-full bg-gradient-to-r ${getStrengthColor(strength)} transition-all duration-500`}
          style={{ width: `${(strength / 5) * 100}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2">
            {req.met ? (
              <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <CheckCircle className="h-3 w-3 text-white" />
              </div>
            ) : (
              <div className="w-5 h-5 bg-gradient-to-r from-gray-300 to-gray-400 rounded-full flex items-center justify-center">
                <XCircle className="h-3 w-3 text-gray-600" />
              </div>
            )}
            <span className={`text-xs ${req.met ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
              {req.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ===== STEP PROGRESS INDICATOR =====
const StepProgress = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  return (
    <div className="flex items-center justify-between mb-8 px-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const isCompleted = index + 1 < currentStep;
        const isCurrent = index + 1 === currentStep;

        return (
          <div key={index} className="flex items-center flex-1 last:flex-none">
            <div className={`relative w-10 h-10 rounded-full border-2 flex items-center justify-center z-10 transition-all duration-300 ${isCompleted
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 border-transparent text-white shadow-lg'
                : isCurrent
                  ? 'bg-white border-2 border-purple-500 text-purple-600 shadow-lg'
                  : 'border-gray-300 bg-white text-gray-500'
              }`}>
              {isCompleted ? (
                <CheckCircle className="h-5 w-5" />
              ) : (
                <span className="font-semibold text-sm">{index + 1}</span>
              )}
              {isCurrent && (
                <div className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping"></div>
              )}
            </div>
            {index < totalSteps - 1 && (
              <div className={`flex-1 h-1 mx-2 transition-all duration-300 ${isCompleted
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600'
                  : 'bg-gradient-to-r from-gray-200 to-gray-300'
                }`} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ===== MAIN COMPONENT =====
export default function EnhancedLoginPage() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const { user } = useAuth(); 
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'missing_profile') {
      setTimeout(() => {
        toast({
          title: 'Login Error',
          description: 'Your account profile could not be found. Please contact support or try registering again.',
          variant: 'destructive',
          duration: 6000,
        });
      }, 500);
      router.replace('/login');
    }
  }, [searchParams, toast, router]);

  useEffect(() => {
    const savedPassword = localStorage.getItem('etire_saved_password');
    if (savedPassword) {
      setLoginPassword(savedPassword);
      setRememberMe(true);
    }
  }, []);

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [isLoading, setIsLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [formLoading, setFormLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successType, setSuccessType] = useState<'login' | 'register'>('login');
  const [successUserData, setSuccessUserData] = useState<{ firstName: string; lastName: string; username: string } | null>(null);

  const { value: loginUsername, setValue: setLoginUsername } = useFormFieldPersistence('login-form', 'username', '');
  const [loginPassword, setLoginPassword] = useState('');

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

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ===== NEW HELPER: RESET FUNCTION =====
  const resetRegisterForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhone("");
    setAddress("");
    setRegisterUsername("");
    setRegisterPassword("");
    setConfirmPassword("");
    setAcceptedTerms(false);
    setRegistrationError(null);
  };

  const simulateProgress = (duration: number = 2000) => {
    setIsLoading(true);
    setLoadingProgress(0);
    const interval = 50;
    const totalSteps = duration / interval;
    const increment = 100 / totalSteps;
    progressIntervalRef.current = setInterval(() => {
      setLoadingProgress(prev => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(progressIntervalRef.current as NodeJS.Timeout);
          return 100;
        }
        return next;
      });
    }, interval);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setRegistrationError(null);

    if (!loginUsername || !loginPassword) {
      toast({
        title: 'Missing Credentials',
        description: 'Username and password are required.',
        variant: 'destructive'
      });
      setFormLoading(false);
      return;
    }
    simulateProgress(1500);

    try {
      const success = await login(loginUsername, loginPassword);
      if (success) {
        if (rememberMe) {
          localStorage.setItem('etire_saved_password', loginPassword);
        } else {
          localStorage.removeItem('etire_saved_password');
        }

        setLoadingProgress(100);
        setSuccessType('login');
        setShowSuccess(true);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setTimeout(() => {
         
        }, 3000);
      } else {
        toast({
          title: 'Login Failed',
          description: 'Invalid username or password.',
          variant: 'destructive'
        });
        setIsLoading(false);
        setLoadingProgress(0);
      }
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: 'Login Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive'
      });
      setIsLoading(false);
      setLoadingProgress(0);
    } finally {
      setFormLoading(false);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegistrationError(null);

    if (!acceptedTerms) {
      toast({
        title: 'Terms Required',
        description: 'You must accept the Terms and Conditions.',
        variant: 'destructive'
      });
      return;
    }
    if (registerPassword !== confirmPassword) {
      toast({
        title: 'Password Mismatch',
        description: 'Passwords do not match.',
        variant: 'destructive'
      });
      return;
    }
    const strength = getPasswordStrength(registerPassword);
    if (strength < 3) {
      toast({
        title: 'Weak Password',
        description: 'Please choose a stronger password.',
        variant: 'destructive'
      });
      return;
    }
    if (!firstName || !lastName || !registerUsername || !registerPassword) {
      toast({
        title: 'Required Fields',
        description: 'All fields marked with * are required.',
        variant: 'destructive'
      });
      return;
    }

    setFormLoading(true);
    simulateProgress(2000);

    try {
      const result = await registerAction({
        firstName,
        lastName,
        username: registerUsername,
        password: registerPassword,
        email,
        phone,
        address
      });

      if (!result.success) {
        throw new Error(result.message || "Registration failed");
      }
      
      setLoadingProgress(100);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      setTimeout(() => {
        setIsLoading(false);
        setSuccessUserData({ firstName, lastName, username: registerUsername });
        setSuccessType('register');
        setShowSuccess(true);
      }, 500);

    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Registration Error",
        description: error.message,
        variant: "destructive",
      });
      setIsLoading(false);
      setLoadingProgress(0);
    } finally {
      setFormLoading(false);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  };

  const handleSuccessClose = () => {
  setShowSuccess(false);

  if (successType === "register") {
    setIsLogin(true);
    setCurrentStep(1);
    setSuccessUserData(null);
    resetRegisterForm();
    setFormKey((prev) => prev + 1);
  } else {
    // ✅ Use user from useAuth
    const role = user?.role;

    if (role === 3) {
      router.push("/admin");
    } else if (role === 2) {
      router.push("/dashboard");
    } else if (role === 1) {
      router.push("/inventory");
    } else {
      router.push("/");
    }
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
    if (toLogin) {
      resetRegisterForm();
    }
    setIsLogin(toLogin);
    setCurrentStep(1);
    setFormKey(prev => prev + 1);
  };

  const nextStep = () => {
    if (currentStep < totalSteps) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  // ===== UPDATED VALIDATE STEP =====
  const validateStep = (step: number) => {
    switch (step) {
      case 1: return firstName.trim() && lastName.trim();
      case 2: return email.trim() && phone.trim();
      case 3: 
        // Checks if all fields are filled AND passwords match
        return registerUsername.trim() && 
               registerPassword.trim() && 
               confirmPassword.trim() && 
               registerPassword === confirmPassword; 
      case 4: return acceptedTerms;
      default: return false;
    }
  };

  const renderRegistrationStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="h-8 w-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Personal Information</h3>
              <p className="text-slate-600">Tell us about yourself</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-name" className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="first-name"
                  placeholder="John"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="h-11 border-2 border-slate-200 transition-all duration-300 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last-name" className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  Last Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="last-name"
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="h-11 border-2 border-slate-200 transition-all duration-300 rounded-xl"
                  required
                />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Contact Details</h3>
              <p className="text-slate-600">How can we reach you?</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 border-2 border-slate-200 transition-all duration-300 rounded-xl"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+63 912 345 6789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-11 border-2 border-slate-200 transition-all duration-300 rounded-xl"
                  required
                />
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-green-100 to-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Account Security</h3>
              <p className="text-slate-600">Create your login credentials</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-username" className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  Username <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="register-username"
                  placeholder="Choose a unique username"
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  className="h-11 border-2 border-slate-200 transition-all duration-300 rounded-xl"
                  required
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="register-password"
                    type={showRegisterPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    className="h-11 pr-12 border-2 border-slate-200 transition-all duration-300 rounded-xl"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-500 hover:text-purple-600 transition-colors"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                  >
                    {showRegisterPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
                {registerPassword && <PasswordStrengthIndicator password={registerPassword} />}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="h-11 pr-12 border-2 border-slate-200 transition-all duration-300 rounded-xl"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-500 hover:text-purple-600 transition-colors"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </Button>
                </div>
                {registerPassword && confirmPassword && registerPassword !== confirmPassword && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Passwords don't match
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-amber-100 to-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-amber-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Review & Agreement</h3>
              <p className="text-slate-600">Almost done! Review your information</p>
            </div>
            <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 space-y-4 mb-4 border border-slate-200">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">Name</span>
                  <div className="text-sm font-semibold text-slate-800">{firstName} {lastName}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">Email</span>
                  <div className="text-sm font-semibold text-slate-800 truncate">{email}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">Phone</span>
                  <div className="text-sm font-semibold text-slate-800">{phone}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-xs font-medium text-slate-500">Username</span>
                  <div className="text-sm font-semibold text-slate-800">{registerUsername}</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                <CustomCheckbox
                  id="terms"
                  checked={acceptedTerms}
                  onCheckedChange={setAcceptedTerms}
                  className="mt-1"
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
                  {' '}and understand that my data will be processed in accordance with the Privacy Policy.
                </Label>
              </div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex relative overflow-hidden font-poppins bg-gradient-to-br from-white via-gray-50 to-slate-100">
      <EnhancedLoadingAnimation
        isLoading={isLoading}
        progress={loadingProgress}
        message={successType === 'login' ? "Signing you in..." : "Creating your account..."}
      />
      <SuccessAnimation
        isVisible={showSuccess}
        title={successType === 'register' ? 'Account Created Successfully!' : 'Welcome Back!'}
        message={successType === 'register'
          ? `Welcome to eTire Manager, ${successUserData?.firstName}! Your account is now active.`
          : 'You have successfully signed in to your eTire Manager account.'
        }
        actionType={successType}
        userData={successUserData || undefined}
        onConfirm={handleSuccessClose}
        onAddAnother={() => {
          setShowSuccess(false);
          setCurrentStep(1);
          setFormKey(prev => prev + 1);
        }}
      />


      {/* Left Side - Hero Section (WIDER: 60% Width) */}
      <div className="hidden lg:flex lg:w-[60%] shrink-0 relative overflow-hidden bg-slate-900">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url('/images/image3.jpg')",
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        ></div>

        <div className="absolute inset-0 bg-gradient-to-br from-purple-600/40 via-transparent to-blue-600/40 mix-blend-overlay z-[5]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-slate-900/50 z-[5]"></div>

        <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-16">
          <div className="max-w-lg text-left">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20 p-[2px]">
                <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                  <Car className="h-8 w-8 text-white drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight drop-shadow-sm">
                  eTire Manager
                </h1>
                <p className="text-lg text-purple-200/80 font-medium tracking-wide">
                  Professional Tire Inventory System
                </p>
              </div>
            </div>

            <div className="space-y-6 mt-12">
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center ring-1 ring-white/10 group-hover:ring-white/30 transition-all flex-shrink-0">
                  <PackageSearch className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg text-white/90 font-medium">Real-time inventory tracking</span>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center ring-1 ring-white/10 group-hover:ring-white/30 transition-all flex-shrink-0">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg text-white/90 font-medium">Advanced analytics & insights</span>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center ring-1 ring-white/10 group-hover:ring-white/30 transition-all flex-shrink-0">
                  <Clock className="h-5 w-5 text-white" />
                </div>
                <span className="text-lg text-white/90 font-medium">24/7 access from any device</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                    <Button
                      type="button"
                      variant="link"
                      className="text-sm text-purple-600 hover:text-purple-700 p-0 h-auto font-semibold"
                    >
                      Forgot password?
                    </Button>
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

          <div className="text-center mt-6">
            <p className="text-xs text-slate-600 mb-2">
              © 2025 eTire Manager. Designed for Queen.R Tire Supply.
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
              <button className="hover:text-purple-600 transition-colors">Privacy Policy</button>
              <span>•</span>
              <button className="hover:text-purple-600 transition-colors">Terms of Service</button>
              <span>•</span>
              <button className="hover:text-purple-600 transition-colors">Contact Support</button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-4">Terms and Conditions</h2>
            <div className="space-y-4 text-sm text-slate-600">
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
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setShowTerms(false)}>
                Close
              </Button>
              <Button onClick={() => setShowTerms(false)} className="bg-gradient-to-r from-purple-600 to-indigo-600">
                I Accept
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

        /* Custom scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
        }

        ::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #8b5cf6, #6366f1);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #7c3aed, #4f46e5);
        }
      `}</style>
    </div>
  );
}