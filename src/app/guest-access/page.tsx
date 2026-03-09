"use client";

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, User, Shield, LogOut } from 'lucide-react';

export default function GuestAccessPage() {
    const { user, logout } = useAuth();
    const router = useRouter();

    useEffect(() => {
        // Redirect if user is not a guest
        if (user && Number(user.role) !== 0) {
            router.push('/dashboard');
        }
    }, [user, router]);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    if (!user || Number(user.role) !== 0) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <User className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Welcome, {user.name}!</h1>
                    <p className="text-muted-foreground mt-2">Your account is pending approval</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-yellow-500" />
                            Account Status
                        </CardTitle>
                        <CardDescription>
                            Your account is currently set to Guest role and is waiting for admin approval.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert>
                            <Shield className="h-4 w-4" />
                            <AlertTitle>Access Restricted</AlertTitle>
                            <AlertDescription>
                                You currently have guest access only. An administrator needs to change your role to Employee or Admin before you can access the system features.
                            </AlertDescription>
                        </Alert>

                        <div className="space-y-3">
                            <h4 className="font-medium text-sm">What happens next?</h4>
                            <ul className="text-sm text-muted-foreground space-y-2">
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                    <span>An administrator will review your account</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                    <span>Your role will be updated to Employee or Admin</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <div className="w-1.5 h-1.5 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                    <span>You&apos;ll receive full access to the system</span>
                                </li>
                            </ul>
                        </div>

                        <div className="pt-4 border-t">
                            <Button 
                                variant="outline" 
                                className="w-full" 
                                onClick={handleLogout}
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Sign Out
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="mt-6 text-center">
                    <p className="text-xs text-muted-foreground">
                        Need help? Contact your system administrator.
                    </p>
                </div>
            </div>
        </div>
    );
}
