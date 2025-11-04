"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserPlus, LogIn, Eye, EyeOff, ArrowLeft, Car, TrendingUp, Shield, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFormFieldPersistence } from '@/hooks/useFormPersistence';

// Iridescence Component with Purple/Blue/Green colors
const Iridescence = ({
  color = [0.6, 0.3, 0.8], // Purple base
  speed = 0.7,
  amplitude = 0.15,
  mouseReact = true,
  ...rest
}: {
  color?: [number, number, number];
  speed?: number;
  amplitude?: number;
  mouseReact?: boolean;
} & React.HTMLAttributes<HTMLDivElement>) => {
  const ctnDom = useRef<HTMLDivElement>(null);
  const mousePos = useRef({ x: 0.5, y: 0.5 });

  useEffect(() => {
    if (!ctnDom.current) return;

    const initIridescence = async () => {
      const { Renderer, Program, Mesh, Color, Triangle } = await import('ogl');
      
      const ctn = ctnDom.current!;
      const renderer = new Renderer();
      const gl = renderer.gl;
      gl.clearColor(1, 1, 1, 1);

      let program: Program;

      function resize() {
        const scale = 1;
        renderer.setSize(ctn.offsetWidth * scale, ctn.offsetHeight * scale);
        if (program) {
          program.uniforms.uResolution.value = new Color(
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height
          );
        }
      }
      window.addEventListener('resize', resize, false);
      resize();

      const vertexShader = `
        attribute vec2 uv;
        attribute vec2 position;

        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position, 0, 1);
        }
      `;

      const fragmentShader = `
        precision highp float;

        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uResolution;
        uniform vec2 uMouse;
        uniform float uAmplitude;
        uniform float uSpeed;

        varying vec2 vUv;

        void main() {
          float mr = min(uResolution.x, uResolution.y);
          vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;

          uv += (uMouse - vec2(0.5)) * uAmplitude;

          float d = -uTime * 0.5 * uSpeed;
          float a = 0.0;
          for (float i = 0.0; i < 8.0; ++i) {
            a += cos(i - d - a * uv.x);
            d += sin(uv.y * i + a);
          }
          d += uTime * 0.5 * uSpeed;
          
          // Enhanced color mixing for purple/blue/green
          vec3 baseColor = uColor;
          vec3 colorMix = vec3(
            cos(uv.x * 3.0 + d) * 0.3 + 0.7,
            cos(uv.y * 2.0 + a) * 0.4 + 0.6,
            cos(a + d) * 0.5 + 0.5
          );
          
          vec3 col = mix(baseColor, colorMix, 0.6);
          col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * col * 1.5;
          gl_FragColor = vec4(col, 1.0);
        }
      `;

      const geometry = new Triangle(gl);
      program = new Program(gl, {
        vertex: vertexShader,
        fragment: fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new Color(...color) },
          uResolution: {
            value: new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height)
          },
          uMouse: { value: new Float32Array([mousePos.current.x, mousePos.current.y]) },
          uAmplitude: { value: amplitude },
          uSpeed: { value: speed }
        }
      });

      const mesh = new Mesh(gl, { geometry, program });
      let animateId: number;

      function update(t: number) {
        animateId = requestAnimationFrame(update);
        program.uniforms.uTime.value = t * 0.001;
        renderer.render({ scene: mesh });
      }
      animateId = requestAnimationFrame(update);
      ctn.appendChild(gl.canvas);

      function handleMouseMove(e: MouseEvent) {
        const rect = ctn.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1.0 - (e.clientY - rect.top) / rect.height;
        mousePos.current = { x, y };
        program.uniforms.uMouse.value[0] = x;
        program.uniforms.uMouse.value[1] = y;
      }
      if (mouseReact) {
        ctn.addEventListener('mousemove', handleMouseMove);
      }

      return () => {
        cancelAnimationFrame(animateId);
        window.removeEventListener('resize', resize);
        if (mouseReact) {
          ctn.removeEventListener('mousemove', handleMouseMove);
        }
        if (ctn.contains(gl.canvas)) {
          ctn.removeChild(gl.canvas);
        }
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      };
    };

    const cleanupPromise = initIridescence();

    return () => {
      cleanupPromise.then(cleanup => {
        if (cleanup) cleanup();
      });
    };
  }, [color, speed, amplitude, mouseReact]);

  return <div ref={ctnDom} className="w-full h-full" {...rest} />;
};

export default function LoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { login } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [mounted, setMounted] = useState(false);

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

    useEffect(() => {
        setMounted(true);
    }, []);

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

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "register",
                    firstName,
                    lastName,
                    username: registerUsername,
                    password: registerPassword,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Registration failed");
            }

            toast({ title: "Success", description: "Registration successful! Please log in." });

            // Reset fields and switch to login view
            setIsLogin(true);
            setFirstName("");
            setLastName("");
            setRegisterUsername("");
            setRegisterPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            toast({
                title: "Registration Error",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const features = [
        {
            icon: TrendingUp,
            title: "Real-time Analytics",
            description: "Monitor sales and performance with live dashboards"
        },
        {
            icon: Shield,
            title: "Secure & Reliable",
            description: "Enterprise-grade security for your business data"
        },
        {
            icon: Users,
            title: "Customer Management",
            description: "Complete customer relationship management"
        },
        {
            icon: Car,
            title: "Auto Services",
            description: "Manage tire and vulcanizing services efficiently"
        }
    ];

    return (
        <div className="min-h-screen flex relative overflow-hidden font-poppins">
            {/* Iridescence Background - Full Screen with Purple/Blue/Green */}
            <div className="absolute inset-0 z-0">
                <Iridescence 
                    color={[0.6, 0.8, 0.6]} // Purple base for purple/blue/green effect
                    speed={0.7}
                    amplitude={0.15}
                    mouseReact={true}
                    className="w-full h-full"
                />
                {/* Enhanced gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-900/40 via-blue-900/30 to-emerald-900/20 backdrop-blur-[2px]"></div>
                
                {/* Animated floating elements */}
                <div className="absolute top-20 left-10 w-6 h-6 bg-purple-400/20 rounded-full animate-float"></div>
                <div className="absolute top-40 right-20 w-8 h-8 bg-blue-400/20 rounded-full animate-float" style={{ animationDelay: '1s' }}></div>
                <div className="absolute bottom-32 left-20 w-10 h-10 bg-emerald-400/20 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
                <div className="absolute bottom-20 right-32 w-12 h-12 bg-purple-400/15 rounded-full animate-float" style={{ animationDelay: '1.5s' }}></div>
            </div>

            {/* Main Content - Centered */}
            <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="w-full max-w-6xl flex flex-col lg:flex-row items-center justify-between gap-12">
                    
                    {/* Left Side - Brand & Features */}
                    <div className={`flex-1 text-white text-center lg:text-left transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
                        <div className="space-y-8">
                            {/* Logo & Brand */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-center lg:justify-start gap-4">
                                    <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/30 shadow-2xl">
                                        <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-3 rounded-xl">
                                            <Car className="h-8 w-8 text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <h1 className="text-5xl lg:text-6xl font-bold bg-gradient-to-r from-white to-purple-100 bg-clip-text text-transparent">
                                            eTire Manager
                                        </h1>
                                        <p className="text-xl text-purple-200 mt-2 font-light">
                                            Queen.R Tire Supply
                                        </p>
                                    </div>
                                </div>
                                
                                <p className="text-lg text-purple-100/90 max-w-2xl leading-relaxed">
                                    Transform your automotive business with our comprehensive management platform. 
                                    Streamline operations, boost sales, and deliver exceptional service.
                                </p>
                            </div>

                            {/* Features Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                                {features.map((feature, index) => (
                                    <div 
                                        key={index}
                                        className={`group bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all duration-500 hover:scale-105 hover:shadow-2xl ${
                                            mounted ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
                                        }`}
                                        style={{ 
                                            transitionDelay: `${300 + index * 100}ms`,
                                            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                                        }}
                                    >
                                        <div className="flex items-start gap-4">
                                            <div className="bg-gradient-to-br from-purple-500 to-blue-600 p-3 rounded-xl group-hover:scale-110 transition-transform duration-300">
                                                <feature.icon className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="text-left">
                                                <h3 className="font-semibold text-white text-lg mb-2">{feature.title}</h3>
                                                <p className="text-purple-100/80 text-sm leading-relaxed">{feature.description}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Stats */}
                            <div className="flex justify-center lg:justify-start gap-8 mt-12">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white">500+</div>
                                    <div className="text-purple-200 text-sm">Businesses</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white">10K+</div>
                                    <div className="text-purple-200 text-sm">Transactions</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-white">24/7</div>
                                    <div className="text-purple-200 text-sm">Support</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Side - Form */}
                    <div className={`flex-1 max-w-md w-full transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                        <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-xl rounded-3xl overflow-hidden">
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-blue-500 to-emerald-500"></div>
                            
                            {isLogin ? (
                                // Login Form
                                <form onSubmit={handleLogin}>
                                    <CardHeader className="space-y-1 pb-6 pt-8 px-8">
                                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent text-center">
                                            Welcome Back
                                        </CardTitle>
                                        <CardDescription className="text-base text-gray-600 text-center">
                                            Sign in to your eTire Manager account
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6 px-8 pb-8">
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="login-username" className="text-sm font-semibold text-gray-700">
                                                    Username
                                                </Label>
                                                <Input 
                                                    id="login-username" 
                                                    placeholder="Enter your username"
                                                    value={loginUsername} 
                                                    onChange={(e) => setLoginUsername(e.target.value)}
                                                    className="h-12 border-2 border-gray-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
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
                                                        className="h-12 pr-12 border-2 border-gray-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
                                                        required 
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-500"
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

                                        <Button 
                                            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl" 
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

                                        <div className="relative my-6">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t border-gray-200" />
                                            </div>
                                            <div className="relative flex justify-center text-sm uppercase">
                                                <span className="bg-white px-4 text-gray-500 font-medium">
                                                    Don't have an account?
                                                </span>
                                            </div>
                                        </div>

                                        <Button
                                            type="button"
                                            variant="outline"
                                            className="w-full h-12 text-base font-semibold border-2 border-purple-200 text-purple-700 hover:border-purple-300 hover:bg-purple-50 transition-all duration-300 rounded-xl"
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
                                    <CardHeader className="space-y-1 pb-6 pt-8 px-8">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="w-fit -ml-3 mb-2 text-gray-600 hover:text-purple-600 transition-colors"
                                            onClick={() => setIsLogin(true)}
                                        >
                                            <ArrowLeft className="h-4 w-4 mr-2" />
                                            Back to login
                                        </Button>
                                        <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent text-center">
                                            Create Account
                                        </CardTitle>
                                        <CardDescription className="text-base text-gray-600 text-center">
                                            Join eTire Manager today
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4 px-8 pb-8">
                                        {registrationError && (
                                            <Alert variant="destructive" className="rounded-xl">
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
                                                    className="h-11 border-2 border-gray-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
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
                                                    className="h-11 border-2 border-gray-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
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
                                                className="h-11 border-2 border-gray-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
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
                                                    className="h-11 pr-12 border-2 border-gray-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
                                                    required 
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-500"
                                                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                                                >
                                                    {showRegisterPassword ? (
                                                        <EyeOff className="h-5 w-5" />
                                                    ) : (
                                                        <Eye className="h-5 w-5" />
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
                                                    className="h-11 pr-12 border-2 border-gray-200 focus:border-purple-500 transition-all duration-300 rounded-xl"
                                                    required 
                                                />
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-gray-500"
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

                                        <Button 
                                            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl mt-4" 
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

                        <p className="text-center text-sm text-white mt-6 backdrop-blur-sm bg-black/20 p-4 rounded-2xl">
                            By continuing, you agree to our{' '}
                            <button className="text-purple-300 hover:text-white hover:underline font-semibold transition-colors">Terms of Service</button>
                            {' '}and{' '}
                            <button className="text-purple-300 hover:text-white hover:underline font-semibold transition-colors">Privacy Policy</button>
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
                        transform: translateY(0px) rotate(0deg);
                    }
                    50% {
                        transform: translateY(-20px) rotate(180deg);
                    }
                }

                .animate-float {
                    animation: float 6s ease-in-out infinite;
                }

                .transition-spring {
                    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
                }
            `}</style>
        </div>
    );
}