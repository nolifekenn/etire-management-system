"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, LogIn, Eye, EyeOff, ArrowLeft, Wrench, Gauge, Car, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFormFieldPersistence } from '@/hooks/useFormPersistence';

export default function LoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);
    
    // Slideshow images with automotive theme
    const slides = [
        {
            image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?q=80&w=2000",
            title: "Performance & Precision",
            subtitle: "Expert automotive solutions"
        },
        {
            image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=2000",
            title: "Speed & Reliability", 
            subtitle: "Your trusted automotive partner"
        },
        {
            image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=2000",
            title: "Quality Service",
            subtitle: "Excellence in every detail"
        }
    ];

    // Auto-advance slideshow every 5 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    // Login State with persistence
    const { value: loginUsername, setValue: setLoginUsername } = useFormFieldPersistence('login-form', 'username', '');
    const { value: loginPassword, setValue: setLoginPassword } = useFormFieldPersistence('login-form', 'password', '');
    
    // Register State with persistence
    const { value: firstName, setValue: setFirstName } = useFormFieldPersistence('register-form', 'firstName', '');
    const { value: lastName, setValue: setLastName } = useFormFieldPersistence('register-form', 'lastName', '');
    const { value: registerUsername, setValue: setRegisterUsername } = useFormFieldPersistence('register-form', 'username', '');
    const { value: registerPassword, setValue: setRegisterPassword } = useFormFieldPersistence('register-form', 'password', '');
    const { value: confirmPassword, setValue: setConfirmPassword } = useFormFieldPersistence('register-form', 'confirmPassword', '');
    const [registrationError, setRegistrationError] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(false);
    
    // Password visibility states
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setRegistrationError(null);
        if (!loginUsername || !loginPassword) {
            toast({ title: 'Error', description: 'Username and password are required.', variant: 'destructive' });
            setIsLoading(false);
            return;
        }

        try {
            const success = await login(loginUsername, loginPassword);
            if (success) {
                toast({ title: 'Success', description: 'Logged in successfully!' });
                router.push('/dashboard');
            } else {
                toast({ title: 'Login Failed', description: 'Invalid username or password.', variant: 'destructive' });
            }
        } catch (error: any) {
            toast({ title: 'Login Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setRegistrationError(null);
        if (registerPassword !== confirmPassword) {
            toast({ title: 'Error', description: 'Passwords do not match.', variant: 'destructive' });
            return;
        }
        if (!firstName || !lastName || !registerUsername || !registerPassword) {
             toast({ title: 'Error', description: 'All fields are required.', variant: 'destructive' });
            return;
        }
        
        setIsLoading(true);

        if (!supabase) {
             toast({ title: 'Configuration Error', description: "Database client is not available.", variant: 'destructive' });
             setIsLoading(false);
             return;
        }

        const { data, error } = await supabase.from('user').insert({
            name: `${firstName} ${lastName}`,
            username: registerUsername,
            password: registerPassword, 
            role: 0
        }).select().single();

        if (error) {
             if (error.message.includes('infinite recursion') || error.message.includes('policy')) {
                setRegistrationError(`Database Security Policy Error: ${error.message}`);
             } else if (error.message.includes('unique constraint') || error.code === '23505') {
                 toast({ title: 'Registration Error', description: 'This username is already taken.', variant: 'destructive' });
             } else {
                console.error('Registration error:', error);
                toast({ title: 'Registration Error', description: error.message || 'An unexpected error occurred.', variant: 'destructive' });
             }
        } else if (data) {
            toast({ title: 'Success', description: 'Registration successful! Please log in.' });
            setIsLogin(true);
            setFirstName('');
            setLastName('');
            setRegisterUsername('');
            setRegisterPassword('');
            setConfirmPassword('');
        }
        
        setIsLoading(false);
    };

    return (
        <div className="min-h-screen flex relative overflow-hidden">
            {/* Left Side - Image Slideshow with Gradient Overlay */}
            <div className="hidden lg:flex lg:w-1/2 relative">
                {/* Slideshow Background */}
                {slides.map((slide, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-1000 ${
                            currentSlide === index ? 'opacity-100' : 'opacity-0'
                        }`}
                        style={{
                            backgroundImage: `url(${slide.image})`,
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                        }}
                    >
                        {/* Gradient Overlay - Dark to Transparent */}
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/80 to-transparent"></div>
                        {/* Blur Effect on Edges */}
                        <div className="absolute inset-0 backdrop-blur-[2px]"></div>
                    </div>
                ))}

                {/* Content Overlay */}
                <div className="relative z-10 w-full p-12 flex flex-col justify-between text-white">
                    {/* Top Section - Logo & Brand */}
                    <div>
                        <div className="flex items-center gap-3 mb-12">
                            <div className="bg-red-600 p-3 rounded-2xl shadow-2xl">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-white">
                                    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                                    <circle cx="12" cy="12" r="6" fill="currentColor"/>
                                    <circle cx="12" cy="12" r="2" fill="white"/>
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight">eTire Manager</h1>
                                <p className="text-slate-300 text-sm mt-1">Queen.R Tire Supply</p>
                            </div>
                        </div>

                        {/* Animated Slide Text */}
                        <div className="space-y-4">
                            <h2 className="text-5xl font-bold leading-tight">
                                {slides[currentSlide].title}
                            </h2>
                            <p className="text-xl text-slate-300">
                                {slides[currentSlide].subtitle}
                            </p>
                        </div>
                    </div>

                    {/* Middle Section - Features */}
                    <div className="space-y-6">
                        <div className="flex items-start gap-4 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 hover:bg-white/15 transition-all">
                            <div className="bg-red-600 p-3 rounded-xl">
                                <Wrench className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg mb-1">Expert Service</h3>
                                <p className="text-slate-300 text-sm">Professional tire & vulcanizing solutions</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 hover:bg-white/15 transition-all">
                            <div className="bg-red-600 p-3 rounded-xl">
                                <Gauge className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg mb-1">Real-Time Tracking</h3>
                                <p className="text-slate-300 text-sm">Monitor inventory and sales instantly</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/20 hover:bg-white/15 transition-all">
                            <div className="bg-red-600 p-3 rounded-xl">
                                <Car className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-lg mb-1">Complete Management</h3>
                                <p className="text-slate-300 text-sm">All-in-one automotive business solution</p>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Section - Stats & Indicators */}
                    <div>
                        <div className="flex gap-8 mb-8">
                            <div>
                                <div className="text-4xl font-bold text-red-500">1000+</div>
                                <div className="text-slate-400 text-sm mt-1">Products</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-red-500">500+</div>
                                <div className="text-slate-400 text-sm mt-1">Clients</div>
                            </div>
                            <div>
                                <div className="text-4xl font-bold text-red-500">24/7</div>
                                <div className="text-slate-400 text-sm mt-1">Support</div>
                            </div>
                        </div>

                        {/* Slideshow Indicators */}
                        <div className="flex gap-2">
                            {slides.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`h-1.5 rounded-full transition-all ${
                                        currentSlide === index 
                                            ? 'w-12 bg-red-500' 
                                            : 'w-8 bg-white/30 hover:bg-white/50'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form Section */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex flex-col items-center mb-8">
                        <div className="bg-red-600 p-4 rounded-2xl shadow-xl mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-12 w-12 text-white">
                                <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/>
                                <circle cx="12" cy="12" r="6" fill="currentColor"/>
                                <circle cx="12" cy="12" r="2" fill="white"/>
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900">eTire Manager</h1>
                        <p className="text-sm text-gray-600 mt-1">Queen.R Tire Supply</p>
                    </div>

                    <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
                        {isLogin ? (
                            // Login Form
                            <form onSubmit={handleLogin}>
                                <CardHeader className="space-y-1 pb-6">
                                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                        Welcome Back
                                    </CardTitle>
                                    <CardDescription className="text-base text-gray-600">
                                        Sign in to manage your tire business
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-5">
                                    <div className="space-y-2">
                                        <Label htmlFor="login-username" className="text-sm font-semibold text-gray-700">
                                            Username
                                        </Label>
                                        <Input 
                                            id="login-username" 
                                            placeholder="Enter your username"
                                            value={loginUsername} 
                                            onChange={(e) => setLoginUsername(e.target.value)}
                                            className="h-12 border-2 border-gray-200 focus:border-red-500 transition-colors"
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="login-password" className="text-sm font-semibold text-gray-700">
                                            Password
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                id="login-password" 
                                                type={showLoginPassword ? "text" : "password"}
                                                placeholder="Enter your password"
                                                value={loginPassword} 
                                                onChange={(e) => setLoginPassword(e.target.value)}
                                                className="h-12 pr-12 border-2 border-gray-200 focus:border-red-500 transition-colors"
                                                required 
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                onClick={() => setShowLoginPassword(!showLoginPassword)}
                                            >
                                                {showLoginPassword ? (
                                                    <EyeOff className="h-5 w-5 text-gray-500" />
                                                ) : (
                                                    <Eye className="h-5 w-5 text-gray-500" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    <Button 
                                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transition-all" 
                                        type="submit" 
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Signing in...
                                            </>
                                        ) : (
                                            <>
                                                <LogIn className="mr-2 h-5 w-5" />
                                                Sign In
                                            </>
                                        )}
                                    </Button>

                                    <div className="relative my-8">
                                        <div className="absolute inset-0 flex items-center">
                                            <span className="w-full border-t-2 border-gray-200" />
                                        </div>
                                        <div className="relative flex justify-center text-sm uppercase">
                                            <span className="bg-white px-4 text-gray-500 font-medium">
                                                New to eTire Manager?
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full h-12 text-base font-semibold border-2 border-gray-300 hover:border-red-500 hover:bg-red-50 transition-all"
                                        onClick={() => setIsLogin(false)}
                                    >
                                        <UserPlus className="mr-2 h-5 w-5" />
                                        Create Account
                                    </Button>
                                </CardContent>
                            </form>
                        ) : (
                            // Register Form
                            <form onSubmit={handleRegister}>
                                <CardHeader className="space-y-1 pb-6">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="w-fit -ml-3 mb-2 text-gray-600 hover:text-red-600"
                                        onClick={() => setIsLogin(true)}
                                    >
                                        <ArrowLeft className="h-4 w-4 mr-2" />
                                        Back to login
                                    </Button>
                                    <CardTitle className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                        Create Account
                                    </CardTitle>
                                    <CardDescription className="text-base text-gray-600">
                                        Join us and start managing your business
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {registrationError && (
                                        <Alert variant="destructive">
                                            <AlertTriangle className="h-4 w-4" />
                                            <AlertTitle>Registration Error</AlertTitle>
                                            <AlertDescription>
                                                {registrationError}
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="first-name" className="text-sm font-semibold text-gray-700">
                                                First Name
                                            </Label>
                                            <Input 
                                                id="first-name" 
                                                placeholder="John"
                                                value={firstName} 
                                                onChange={(e) => setFirstName(e.target.value)}
                                                className="h-11 border-2 border-gray-200 focus:border-red-500"
                                                required 
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="last-name" className="text-sm font-semibold text-gray-700">
                                                Last Name
                                            </Label>
                                            <Input 
                                                id="last-name" 
                                                placeholder="Doe"
                                                value={lastName} 
                                                onChange={(e) => setLastName(e.target.value)}
                                                className="h-11 border-2 border-gray-200 focus:border-red-500"
                                                required 
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-username" className="text-sm font-semibold text-gray-700">
                                            Username
                                        </Label>
                                        <Input 
                                            id="register-username" 
                                            placeholder="Choose a unique username"
                                            value={registerUsername} 
                                            onChange={(e) => setRegisterUsername(e.target.value)}
                                            className="h-11 border-2 border-gray-200 focus:border-red-500"
                                            required 
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="register-password" className="text-sm font-semibold text-gray-700">
                                            Password
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                id="register-password" 
                                                type={showRegisterPassword ? "text" : "password"}
                                                placeholder="Create a strong password"
                                                value={registerPassword} 
                                                onChange={(e) => setRegisterPassword(e.target.value)}
                                                className="h-11 pr-12 border-2 border-gray-200 focus:border-red-500"
                                                required 
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                            >
                                                {showRegisterPassword ? (
                                                    <EyeOff className="h-5 w-5 text-gray-500" />
                                                ) : (
                                                    <Eye className="h-5 w-5 text-gray-500" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="confirm-password" className="text-sm font-semibold text-gray-700">
                                            Confirm Password
                                        </Label>
                                        <div className="relative">
                                            <Input 
                                                id="confirm-password" 
                                                type={showConfirmPassword ? "text" : "password"}
                                                placeholder="Re-enter your password"
                                                value={confirmPassword} 
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="h-11 pr-12 border-2 border-gray-200 focus:border-red-500"
                                                required 
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            >
                                                {showConfirmPassword ? (
                                                    <EyeOff className="h-5 w-5 text-gray-500" />
                                                ) : (
                                                    <Eye className="h-5 w-5 text-gray-500" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>

                                    <Button 
                                        className="w-full h-12 text-base font-semibold bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 shadow-lg hover:shadow-xl transition-all mt-6" 
                                        type="submit" 
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                                Creating account...
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="mr-2 h-5 w-5" />
                                                Create Account
                                            </>
                                        )}
                                    </Button>
                                </CardContent>
                            </form>
                        )}
                    </Card>

                    <p className="text-center text-sm text-gray-600 mt-6">
                        By continuing, you agree to our{' '}
                        <button className="text-red-600 hover:underline font-semibold">Terms of Service</button>
                        {' '}and{' '}
                        <button className="text-red-600 hover:underline font-semibold">Privacy Policy</button>
                    </p>
                </div>
            </div>
        </div>
    );
}