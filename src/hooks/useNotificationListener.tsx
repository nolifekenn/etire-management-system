"use client";

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { Notification } from '@/lib/types';

/**
 * Hook to listen for real-time notifications and show toast popups
 * Add this to your root layout to enable notifications across the app
 */
export function useNotificationListener() {
    const { user } = useAuth();

    useEffect(() => {
        if (!supabase || !user) return;

        // Subscribe to new notifications for this user
        const channel = supabase
            .channel('notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notification',
                    filter: `user_id=eq.${user.user_id}`,
                },
                (payload) => {
                    const notification = payload.new as Notification;

                    // Show toast popup
                    showNotificationToast(notification);
                }
            )
            .subscribe();

        // Cleanup subscription on unmount
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);
}

/**
 * Show a toast notification based on notification type
 */
function showNotificationToast(notification: Notification) {
    const getVariant = (type: string) => {
        switch (type) {
            case 'success':
                return 'default';
            case 'error':
                return 'destructive';
            case 'warning':
                return 'default';
            case 'info':
            default:
                return 'default';
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'success':
                return '✅';
            case 'error':
                return '🚨';
            case 'warning':
                return '⚠️';
            case 'info':
            default:
                return 'ℹ️';
        }
    };

    toast({
        title: (
            <div className="flex items-center gap-2">
                <span>{getIcon(notification.type)}</span>
                <span>{notification.title}</span>
            </div>
        ) as unknown as string,
        description: notification.message,
        variant: getVariant(notification.type),
        duration: 5000, // Auto-dismiss after 5 seconds
    });
}

/**
 * Manually trigger a notification toast (for testing or immediate feedback)
 */
export function showNotification(
    title: string,
    message: string,
    type: 'info' | 'warning' | 'error' | 'success' = 'info'
) {
    showNotificationToast({
        notification_id: '',
        user_id: '',
        title,
        message,
        type,
        is_read: false,
        created_at: new Date().toISOString(),
    });
}
