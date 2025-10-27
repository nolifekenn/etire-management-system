"use client";

import { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, Bell, CheckCircle, Info, AlertCircle, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Notification } from '@/lib/types';

export default function NotificationsPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!supabase || !authUser) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('notification')
            .select('*')
            .eq('user_id', authUser.user_id)
            .order('created_at', { ascending: false });

        if (error) {
            setError(`Could not fetch notifications: ${error.message}`);
            setNotifications([]);
        } else {
            setNotifications(data as Notification[]);
            setError(null);
        }
        setIsLoading(false);
    }, [authUser]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const markAsRead = async (notificationId: string) => {
        if (!supabase) return;
        const { error } = await supabase
            .from('notification')
            .update({ is_read: true })
            .eq('notification_id', notificationId);

        if (error) {
            toast({ title: "Error", description: "Could not mark notification as read.", variant: "destructive" });
        } else {
            setNotifications(prev => 
                prev.map(notif => 
                    notif.notification_id === notificationId 
                        ? { ...notif, is_read: true }
                        : notif
                )
            );
        }
    };

    const markAllAsRead = async () => {
        if (!supabase || !authUser) return;
        const { error } = await supabase
            .from('notification')
            .update({ is_read: true })
            .eq('user_id', authUser.user_id)
            .eq('is_read', false);

        if (error) {
            toast({ title: "Error", description: "Could not mark all notifications as read.", variant: "destructive" });
        } else {
            setNotifications(prev => 
                prev.map(notif => ({ ...notif, is_read: true }))
            );
            toast({ title: "Success", description: "All notifications marked as read." });
        }
    };

    const deleteNotification = async (notificationId: string) => {
        if (!supabase) return;
        const { error } = await supabase
            .from('notification')
            .delete()
            .eq('notification_id', notificationId);

        if (error) {
            toast({ title: "Error", description: "Could not delete notification.", variant: "destructive" });
        } else {
            setNotifications(prev => 
                prev.filter(notif => notif.notification_id !== notificationId)
            );
        }
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-500" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            case 'error':
                return <XCircle className="h-5 w-5 text-red-500" />;
            case 'info':
            default:
                return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    const getNotificationBadgeColor = (type: string) => {
        switch (type) {
            case 'success':
                return 'bg-green-100 text-green-700';
            case 'warning':
                return 'bg-yellow-100 text-yellow-700';
            case 'error':
                return 'bg-red-100 text-red-700';
            case 'info':
            default:
                return 'bg-blue-100 text-blue-700';
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    if (error) {
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <PageHeader title="Notifications & Alerts" description="View and manage your notifications." />
                <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <PageHeader 
                title="Notifications & Alerts" 
                description="View and manage your notifications and system alerts."
            >
                {unreadCount > 0 && (
                    <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={markAllAsRead}
                        disabled={isLoading}
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark All as Read
                    </Button>
                )}
            </PageHeader>

            {isLoading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.length === 0 ? (
                        <Card>
                            <CardContent className="flex flex-col items-center justify-center py-12">
                                <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                                <h3 className="text-lg font-semibold text-muted-foreground">No notifications</h3>
                                <p className="text-sm text-muted-foreground">You're all caught up! No new notifications.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        notifications.map((notification) => (
                            <Card 
                                key={notification.notification_id} 
                                className={`transition-all duration-200 hover:shadow-md ${
                                    !notification.is_read ? 'border-l-4 border-l-primary bg-primary/5' : ''
                                }`}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start space-x-3">
                                            {getNotificationIcon(notification.type)}
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2 mb-1">
                                                    <CardTitle className="text-base">{notification.title}</CardTitle>
                                                    {!notification.is_read && (
                                                        <Badge variant="default" className="text-xs">
                                                            New
                                                        </Badge>
                                                    )}
                                                    <Badge 
                                                        variant="outline" 
                                                        className={`text-xs ${getNotificationBadgeColor(notification.type)}`}
                                                    >
                                                        {notification.type}
                                                    </Badge>
                                                </div>
                                                <CardDescription className="text-sm">
                                                    {notification.message}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-xs text-muted-foreground">
                                                {new Date(notification.created_at || '').toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex items-center space-x-2">
                                        {!notification.is_read && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => markAsRead(notification.notification_id)}
                                            >
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                                Mark as Read
                                            </Button>
                                        )}
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => deleteNotification(notification.notification_id)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <XCircle className="mr-2 h-4 w-4" />
                                            Delete
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
