
"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '@/lib/types';
import { supabase } from '@/lib/supabaseClient';
import { 
    getAuthToken, 
    saveAuthToken, 
    clearAuthToken, 
    getCurrentUser, 
    createAuthToken,
    isAuthenticated 
} from '@/lib/tokenAuth';

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    isLoading: false,
    login: async () => false,
    logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Check for existing token on mount
        const checkAuthToken = async () => {
            try {
                const token = getAuthToken();
                if (token) {
                    // Verify token is still valid by checking with database
                    if (supabase) {
                        const { data: userData, error } = await supabase
                            .from('user')
                            .select('*')
                            .eq('user_id', token.user.user_id)
                            .single();
                        
                        if (userData && !error) {
                            setUser(userData);
                        } else {
                            // Token is invalid, clear it
                            clearAuthToken();
                        }
                    } else {
                        // Use token data if no database connection
                        setUser(token.user as User);
                    }
                }
            } catch (error) {
                console.error('Error checking auth token:', error);
                clearAuthToken();
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthToken();
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        console.log('Supabase client status:', supabase ? 'Available' : 'NULL');
        console.log('Environment variables:', {
            url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
            key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
        });
        
        if (!supabase) {
            console.error('Supabase client not available. Please check your environment configuration.');
            return false;
        }

        try {
            setIsLoading(true);
            
            // First, find the user in our user table
            console.log('Attempting to login user:', username);
            const { data: userData, error: userError } = await supabase
                .from('user')
                .select('*')
                .eq('username', username)
                .single();

            console.log('Database query result:', { userData, userError });

            if (userError) {
                console.error('Database error:', userError);
                if (userError.code === 'PGRST116') {
                    console.error('User not found in database. Please check if the user exists.');
                } else {
                    console.error('Database connection error. Please check your Supabase configuration.');
                }
                return false;
            }

            if (!userData) {
                console.error('User not found:', username);
                return false;
            }

            console.log('User found:', userData);

            // Check password (in a real app, this should be hashed)
            console.log('Password check:', { 
                provided: password, 
                stored: userData.password, 
                match: userData.password === password 
            });
            
            if (userData.password !== password) {
                console.error('Invalid password for user:', username);
                return false;
            }

            // Create and save auth token
            const authToken = createAuthToken(userData);
            saveAuthToken(authToken);
            
            // Set the user in our context
            setUser(userData);
            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        clearAuthToken();
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
