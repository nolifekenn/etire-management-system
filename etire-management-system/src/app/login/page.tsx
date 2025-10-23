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

    // Replace handleRegister and handleLogin functions
    
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
            console.log('Attempting login for username:', loginUsername);
            
            // Step 1: Find user in database by username
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('username', loginUsername)
                .single();
    
            if (userError || !userData) {
                console.error('User not found:', userError);
                throw new Error('Invalid username or password');
            }
    
            console.log('User found:', userData);
    
            // Step 2: Sign in with auth_id if exists, otherwise use email
            const email = userData.email || `${loginUsername}@etire.com`;
            
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: loginPassword,
            });
    
            if (authError) {
                console.error('Login auth error:', authError);
                throw new Error('Invalid username or password');
            }
    
            console.log('Login successful:', userData);
    
            // Store user data in localStorage
            localStorage.setItem('user', JSON.stringify(userData));
    
            toast({ title: 'Success', description: 'Logged in successfully!' });
            router.push('/dashboard');
    
        } catch (error: any) {
            console.error('Login error:', error);
            toast({ 
                title: 'Login Failed', 
                description: error.message || 'Invalid username or password.', 
                variant: 'destructive' 
            });
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
        
        if (registerPassword.length < 6) {
            toast({ title: 'Error', description: 'Password must be at least 6 characters long.', variant: 'destructive' });
            return;
        }
        
        if (!firstName || !lastName || !registerUsername || !registerPassword) {
            toast({ title: 'Error', description: 'All fields are required.', variant: 'destructive' });
            return;
        }
        
        setIsLoading(true);
    
        try {
            console.log('Step 1: Checking if username exists...');
            
            // Check if username already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('username')
                .eq('username', registerUsername)
                .single();
    
            if (existingUser) {
                throw new Error('Username already taken');
            }
    
            console.log('Step 2: Creating auth user...');
            
            // Create Supabase Auth user with auto-generated email
            const generatedEmail = `${registerUsername}@etire.com`;
            
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: generatedEmail,
                password: registerPassword,
                options: {
                    data: {
                        username: registerUsername,
                        full_name: `${firstName} ${lastName}`
                    }
                }
            });
    
            if (authError) {
                console.error('Auth signup error:', authError);
                throw authError;
            }
    
            if (!authData.user) {
                throw new Error('No user data returned from signup');
            }
    
            console.log('Step 3: Auth user created, ID:', authData.user.id);
            console.log('Step 4: Creating database user record...');
    
            // Create user record in users table
            const newUser = {
                auth_id: authData.user.id,
                username: registerUsername,
                email: generatedEmail,
                full_name: `${firstName} ${lastName}`,
                role: 1, // Default role (1 = cashier)
                is_active: true,
            };
    
            console.log('Inserting user:', newUser);
    
            const { data: userData, error: userError } = await supabase
                .from('users')
                .insert(newUser)
                .select()
                .single();
    
            if (userError) {
                console.error('User table insert error:', userError);
                
                // Cleanup: Try to delete the auth user if database insert fails
                try {
                    await supabase.auth.admin.deleteUser(authData.user.id);
                } catch (cleanupError) {
                    console.error('Failed to cleanup auth user:', cleanupError);
                }
                
                throw userError;
            }
    
            console.log('Step 5: Registration successful!', userData);
    
            toast({ 
                title: 'Success', 
                description: 'Registration successful! You can now log in.' 
            });
            
            setActiveTab("login");
            
            // Clear registration form
            setFirstName('');
            setLastName('');
            setRegisterUsername('');
            setRegisterPassword('');
            setConfirmPassword('');
    
        } catch (error: any) {
            console.error('Full registration error:', error);
            console.error('Error details:', {
                message: error?.message,
                details: error?.details,
                hint: error?.hint,
                code: error?.code,
            });
    
            if (error?.message?.includes('Username already taken')) {
                toast({
                    title: 'Registration Error',
                    description: 'This username is already taken.',
                    variant: 'destructive',
                });
            } else if (error?.message?.includes('duplicate') || error?.code === '23505') {
                toast({
                    title: 'Registration Error',
                    description: 'This username is already taken.',
                    variant: 'destructive',
                });
            } else if (error?.message?.includes('User already registered')) {
                toast({
                    title: 'Registration Error',
                    description: 'An account already exists with this information.',
                    variant: 'destructive',
                });
            } else if (error?.code === '42P01') {
                setRegistrationError(`Table not found: ${error.message}. Please ensure your database schema is properly set up.`);
            } else if (error?.message?.includes('policy') || error?.message?.includes('permission')) {
                setRegistrationError(
                    `Database Security Policy Error: ${error.message}. ` +
                    `Row Level Security is blocking user creation. Please check your RLS policies.`
                );
            } else {
                toast({
                    title: 'Registration Error',
                    description: error?.message || 'An unexpected error occurred during registration.',
                    variant: 'destructive',
                });
            }
        } finally {
            setIsLoading(false);
        }
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
                            <p>Run the following SQL in your Supabase SQL Editor:</p>
                            <pre className="mt-2 p-2 bg-gray-800 text-white rounded-md text-xs whitespace-pre-wrap">
{`-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public user registration" ON public.users;
DROP POLICY IF EXISTS "Users can read own data" ON public.users;
DROP POLICY IF EXISTS "Service role has full access" ON public.users;

-- Allow anyone to insert new users (for registration)
CREATE POLICY "Allow public user registration"
ON public.users
FOR INSERT
WITH CHECK (true);

-- Allow users to read their own data
CREATE POLICY "Users can read own data"
ON public.users
FOR SELECT
USING (auth.uid() = auth_id OR auth.role() = 'authenticated');

-- Allow service role full access (for admin operations)
CREATE POLICY "Service role has full access"
ON public.users
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');`}
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
