
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, UserPlus, LogIn, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useFormFieldPersistence } from '@/hooks/useFormPersistence';

export default function LoginPage() {
    const { toast } = useToast();
    const router = useRouter();
    const { login } = useAuth();
    const [activeTab, setActiveTab] = useState("login");

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
             toast({ title: 'Configuration Error', description: "Database client is not available. Please check your environment configuration.", variant: 'destructive' });
             setIsLoading(false);
             return;
        }

        const { data, error } = await supabase.from('user').insert({
            name: `${firstName} ${lastName}`,
            username: registerUsername,
            password: registerPassword, 
            role: 0 // Default role is Guest
        }).select().single();

        if (error) {
             if (error.message.includes('infinite recursion') || error.message.includes('policy')) {
                setRegistrationError(`Database Security Policy Error: ${error.message}. This is happening because the policy on your 'user' table is preventing new users from being created. You need a policy that allows anonymous inserts.`);
             } else if (error.message.includes('unique constraint') || error.code === '23505') {
                 toast({ title: 'Registration Error', description: 'This username is already taken.', variant: 'destructive' });
             } else if (error.code === 'PGRST301') {
                 toast({ title: 'Registration Error', description: 'Database connection failed. Please check your Supabase configuration.', variant: 'destructive' });
             } else {
                console.error('Registration error:', error);
                toast({ title: 'Registration Error', description: error.message || 'An unexpected error occurred during registration.', variant: 'destructive' });
             }
        } else if (data) {
            toast({ title: 'Success', description: 'Registration successful! Please log in.' });
            setActiveTab("login");
            // Clear registration form
            setFirstName('');
            setLastName('');
            setRegisterUsername('');
            setRegisterPassword('');
            setConfirmPassword('');
        }
        
        setIsLoading(false);
    };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <div className="flex items-center gap-3 mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-12 w-12 text-primary">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v2h-2v-2zm0 4h2v6h-2v-6z"/>
          </svg>
          <div className="flex flex-col">
            <h1 className="text-4xl font-semibold text-foreground">eTire Manager</h1>
            <p className="text-sm text-muted-foreground">Queen.R Tire Supply & Vulcanizing Shop</p>
          </div>
        </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-md">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="login">Login</TabsTrigger>
          <TabsTrigger value="register">Register</TabsTrigger>
        </TabsList>
        <TabsContent value="login">
          <Card>
            <form onSubmit={handleLogin}>
                <CardHeader>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Enter your credentials to access your account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="login-username">Username</Label>
                    <Input id="login-username" value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <div className="relative">
                        <Input 
                            id="login-password" 
                            type={showLoginPassword ? "text" : "password"} 
                            value={loginPassword} 
                            onChange={(e) => setLoginPassword(e.target.value)} 
                            required 
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                        >
                            {showLoginPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
                </CardContent>
                <CardFooter>
                <Button className="w-full" type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                    Login
                </Button>
                </CardFooter>
            </form>
          </Card>
        </TabsContent>
        <TabsContent value="register">
          <Card>
             <form onSubmit={handleRegister}>
                <CardHeader>
                <CardTitle>Create an Account</CardTitle>
                <CardDescription>Fill in the details below to create a new account.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                {registrationError && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Registration Error</AlertTitle>
                        <AlertDescription>
                            {registrationError}
                            <p className="font-bold mt-4">How to fix:</p>
                            <p>Run the following SQL in your Supabase SQL Editor. It will allow anyone to create an account, and allow logged-in users to read from the users table (which is needed for other parts of the app). After running, try registering again.</p>
                            <pre className="mt-2 p-2 bg-gray-800 text-white rounded-md text-xs whitespace-pre-wrap">
{`-- This script allows anonymous inserts and authenticated reads on the 'users' table.
DROP POLICY IF EXISTS "Allow anonymous insert on users" ON public.users;
DROP POLICY IF EXISTS "Allow authenticated read access on users" ON public.users;

-- 1. Policy to allow anyone to create a user (for registration)
CREATE POLICY "Allow anonymous insert on users"
ON public.users
FOR INSERT
WITH CHECK (true);

-- 2. Policy to allow logged-in users to read the user list
CREATE POLICY "Allow authenticated read access on users"
ON public.users
FOR SELECT
USING (auth.role() = 'authenticated');`}
                            </pre>
                        </AlertDescription>
                    </Alert>
                )}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="first-name">First Name</Label>
                        <Input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="last-name">Last Name</Label>
                        <Input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="register-username">Username</Label>
                    <Input id="register-username" value={registerUsername} onChange={(e) => setRegisterUsername(e.target.value)} required />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <div className="relative">
                        <Input 
                            id="register-password" 
                            type={showRegisterPassword ? "text" : "password"} 
                            value={registerPassword} 
                            onChange={(e) => setRegisterPassword(e.target.value)} 
                            required 
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        >
                            {showRegisterPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
                 <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <div className="relative">
                        <Input 
                            id="confirm-password" 
                            type={showConfirmPassword ? "text" : "password"} 
                            value={confirmPassword} 
                            onChange={(e) => setConfirmPassword(e.target.value)} 
                            required 
                        />
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? (
                                <EyeOff className="h-4 w-4" />
                            ) : (
                                <Eye className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
                </CardContent>
                <CardFooter>
                <Button className="w-full" type="submit" disabled={isLoading}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                    Register
                </Button>
                </CardFooter>
            </form>
          </Card>
        </TabsContent>
      </Tabs>
    </main>
  );
}
    
