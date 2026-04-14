/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Settings as SettingsIcon, Shield, History, Bell, RefreshCw, CheckCircle, XCircle, Info, Eye, EyeOff, AlertCircle, Users, ExternalLink, UserCheck, UserX, Plus, PencilLine, Trash2, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SystemSetting, AuditLog, Notification } from '@/lib/types';
import Link from 'next/link';
import { validateShortText, validateNumber, type FieldError } from '@/lib/validation';
import {
  listServiceCatalogForSettings,
  upsertServiceCatalogItem,
  archiveServiceCatalogItem,
  type ServiceFormCatalogItem,
} from '@/lib/actions/services';

// Design system from POS page (keeping the button styles and animations)
const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg",
  secondary: "flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300"
};

const microAnimations = {
  fadeIn: "animate-in fade-in duration-500",
  iconHover: "transition-all duration-350 group-hover:scale-105 group-hover:translate-y-[-2px]",
  cardHover: "transition-all duration-300 ease-out hover:translate-y-[-2px] hover:shadow-md",
};

// ===== PASSWORD STRENGTH INDICATOR =====
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
          {strength < 2 ? <AlertCircle className="h-4 w-4 text-red-500" /> : <CheckCircle className="h-4 w-4 text-green-500" />}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {requirements.map((req, index) => (
          <div key={index} className="flex items-center gap-2">
            {req.met ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : (
              <XCircle className="h-3 w-3 text-gray-400" />
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

export default function SettingsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('account');
  const [mounted, setMounted] = useState(false);

  // Form state - initialize with authenticated user data
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile validation errors
  const [nameError,     setNameError]     = useState<FieldError>(null);
  const [usernameError, setUsernameError] = useState<FieldError>(null);

  // Password Verification State
  const [isVerifyDialogOpen, setIsVerifyDialogOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);


  // System settings state
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isNotifLoading, setIsNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState<string | null>(null);

  // Users state (admins only)
  const [settingsUsers,          setSettingsUsers]          = useState<Record<string, unknown>[]>([]);
  const [isUsersLoading,         setIsUsersLoading]         = useState(false);
  const [usersError,             setUsersError]             = useState<string | null>(null);

  // Service catalog state (admins/managers)
  const [serviceCatalog, setServiceCatalog] = useState<ServiceFormCatalogItem[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogId, setCatalogId] = useState<string | null>(null);
  const [catalogName, setCatalogName] = useState('');
  const [catalogSku, setCatalogSku] = useState('');
  const [catalogPrice, setCatalogPrice] = useState('');
  const [catalogNameError, setCatalogNameError] = useState<FieldError>(null);
  const [catalogPriceError, setCatalogPriceError] = useState<FieldError>(null);

  // System settings validation errors


  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setUsername(user.username);
    }
  }, [user]);

  const fetchSystemSettings = useCallback(async () => {
    if (!supabase) return;
    setIsSettingsLoading(true);
    const { data, error } = await supabase
      .from('system_settings')
      .select('*')
      .order('key', { ascending: true });

    if (error) {
      setSettingsError(`Could not fetch system settings: ${error.message}`);
      setSystemSettings([]);
    } else {
      setSystemSettings(data as SystemSetting[]);
      setSettingsError(null);

      // Populate form fields
      // (company settings removed — values are hardcoded in receipt generator)
    }
    setIsSettingsLoading(false);
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    if (!supabase) return;
    setIsAuditLoading(true);
    const { data, error } = await supabase
      .from('audit_log')
      .select('*, user(name)')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      setAuditError(`Could not fetch audit logs: ${error.message}`);
      setAuditLogs([]);
    } else {
      setAuditLogs(data as any);
      setAuditError(null);
    }
    setIsAuditLoading(false);
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (!supabase || !user) return;
    setIsNotifLoading(true);
    const { data, error } = await (supabase
      .from('notification') as any)
      .select('*')
      .eq('user_id', user.user_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      // Table may not exist yet in this environment — show empty state silently
      setNotifications([]);
      setNotifError(null);
    } else {
      setNotifications(data as Notification[]);
      setNotifError(null);
    }
    setIsNotifLoading(false);
  }, [user]);

  const fetchSettingsUsers = useCallback(async () => {
    setIsUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const result = await res.json();
      if (res.ok) {
        setSettingsUsers(result.data as Record<string, unknown>[]);
        setUsersError(null);
      } else {
        setUsersError(result.error || 'Could not load users');
      }
    } catch (e: any) {
      setUsersError(e.message);
    } finally {
      setIsUsersLoading(false);
    }
  }, []);

  const fetchServiceCatalog = useCallback(async () => {
    setIsCatalogLoading(true);
    const result = await listServiceCatalogForSettings();

    if (!result.success) {
      setCatalogError(`Could not fetch service catalog: ${result.error ?? 'Unknown error'}`);
      setServiceCatalog([]);
    } else {
      setServiceCatalog(result.items);
      setCatalogError(null);
    }
    setIsCatalogLoading(false);
  }, []);

  const resetCatalogForm = () => {
    setCatalogId(null);
    setCatalogName('');
    setCatalogSku('');
    setCatalogPrice('');
    setCatalogNameError(null);
    setCatalogPriceError(null);
  };

  const startEditCatalogItem = (item: ServiceFormCatalogItem) => {
    setCatalogId(String(item.item_id));
    setCatalogName(String(item.name));
    setCatalogSku(String(item.sku ?? ''));
    setCatalogPrice(String(item.sale_price ?? 0));
    setCatalogNameError(null);
    setCatalogPriceError(null);
    setActiveTab('services');
  };

  const handleCatalogSave = async () => {
    if (!user) return;

    const nameErr = validateShortText(catalogName, { label: 'Service name', required: true, minLength: 2, maxLength: 100 });
    const priceErr = validateNumber(catalogPrice, { label: 'Sale price', required: true, min: 0 });
    setCatalogNameError(nameErr);
    setCatalogPriceError(priceErr);
    if (nameErr || priceErr) return;

    setIsCatalogLoading(true);
    const result = await upsertServiceCatalogItem({
      item_id: catalogId ?? undefined,
      name: catalogName,
      sku: catalogSku,
      sale_price: Number(catalogPrice),
    });

    if (!result.success) {
      toast({ title: 'Save Error', description: result.error ?? 'Save failed', variant: 'destructive' });
      setIsCatalogLoading(false);
      return;
    }

    toast({ title: catalogId ? 'Service updated' : 'Service added' });
    resetCatalogForm();
    await fetchServiceCatalog();
  };

  const handleCatalogArchive = async (itemId: string) => {
    if (!user) return;
    const result = await archiveServiceCatalogItem(itemId);

    if (!result.success) {
      toast({ title: 'Error', description: result.error ?? 'Archive failed', variant: 'destructive' });
      return;
    }

    if (catalogId === itemId) {
      resetCatalogForm();
    }
    await fetchServiceCatalog();
  };

  useEffect(() => {
    fetchSystemSettings();
    fetchNotifications();
    if (user?.role === 'super_admin' || user?.role === 'branch_manager') { // Only admins and managers can see audit logs
      fetchAuditLogs();
      fetchSettingsUsers();
      fetchServiceCatalog();
    }
  }, [fetchSystemSettings, fetchAuditLogs, fetchNotifications, fetchSettingsUsers, fetchServiceCatalog, user]);

  const handleSaveChanges = async () => {
    if (!user || !supabase) {
      toast({ title: "Error", description: "You must be logged in to change settings.", variant: "destructive" });
      return;
    }

    // Inline validation for profile fields
    const nErr = validateShortText(name,     { label: 'Full name', required: true, minLength: 2, maxLength: 100 });
    const uErr = validateShortText(username, { label: 'Username',  required: true, minLength: 2, maxLength: 50  });
    setNameError(nErr);
    setUsernameError(uErr);
    if (nErr || uErr) return;

    // Password validation logic
    if (password) {
      if (password !== confirmPassword) {
        toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
        return;
      }

      // Check strength
      let score = 0;
      if (password.length >= 8) score++;
      if (/[A-Z]/.test(password)) score++;
      if (/[a-z]/.test(password)) score++;
      if (/[0-9]/.test(password)) score++;
      if (/[^A-Za-z0-9]/.test(password)) score++;

      if (score < 3) {
        toast({ title: "Weak Password", description: "Please choose a stronger password (at least 'Fair' strength).", variant: "destructive" });
        return;
      }

      // Open verification dialog
      setIsVerifyDialogOpen(true);
      return;
    }

    // Direct save for non-password changes
    setIsSaving(true);
    const updateData: { name: string; username: string } = {
      name,
      username,
    };

    const { error } = await (supabase
      .from('user') as any)
      .update(updateData)
      .eq('user_id', user.user_id);

    if (error) {
      toast({ title: "Save Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Profile updated successfully." });
    }
    setIsSaving(false);
  };

  const handleVerifyAndSave = async () => {
    if (!user || !supabase || !oldPassword) return;
    setIsVerifying(true);
    console.log("[Settings] Starting password verification...");

    // Helper to timeout promises
    const withTimeout = (promise: Promise<any>, ms: number = 20000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${ms}ms`)), ms))
      ]);
    };

    try {
      // 1. Verify old password by attempting to sign in
      const email = `${user.username}@etire-system.local`;

      const { data: signInData, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password: oldPassword,
        })
      );

      if (signInError) {
        console.error("[Settings] Verification failed:", signInError);
        toast({ title: "Verification Failed", description: "Incorrect old password.", variant: "destructive" });
        setIsVerifying(false);
        return;
      }

      console.log("[Settings] Verification successful");

      // 2. If verified, proceed with password update
      setIsSaving(true);

      // Update Auth Password
      const { error: authError } = await withTimeout(
        supabase.auth.updateUser({ password: password })
      );

      if (authError) {
        throw new Error(`Auth Update Failed: ${authError.message}`);
      }

      // Update Public User Profile
      const updateData: { name: string; username: string; password?: string } = {
        name,
        username,
        password: password
      };

      const { error: dbError } = await (supabase.from('user') as any)
        .update(updateData)
        .eq('user_id', user.user_id);

      if (dbError) {
        // Note: If auth succeeded but this failed, user is in weird state, but password IS changed.
        console.error("Profile update error", dbError);
        // We won't throw here to avoid telling user it failed when password actually changed
        toast({ title: "Warning", description: "Password changed but profile details may not have updated.", variant: "default" });
      } else {
        toast({ title: "Success", description: "Password and profile updated successfully." });
      }

      // Cleanup
      setPassword('');
      setConfirmPassword('');
      setOldPassword('');
      setIsVerifyDialogOpen(false);

    } catch (error: any) {
      console.error("[Settings] Handle verify error:", error);
      toast({ title: "Update Error", description: error.message, variant: "destructive" });
    } finally {
      setIsVerifying(false);
      setIsSaving(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!supabase) return;
    const { error } = await (supabase
      .from('notification') as any)
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

  const deleteNotification = async (notificationId: string) => {
    if (!supabase) return;
    // Soft delete: set deleted_at timestamp instead of removing the record
    const { error } = await (supabase
      .from('notification') as any)
      .update({ deleted_at: new Date().toISOString() })
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

  const markAllAsRead = async () => {
    if (!supabase || !user) return;
    const unread = notifications.filter(n => !n.is_read);
    if (unread.length === 0) return;
    const { error } = await (supabase.from('notification') as any)
      .update({ is_read: true })
      .eq('user_id', user.user_id)
      .eq('is_read', false);
    if (!error) {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }
  };

  const refreshData = () => {
    fetchSystemSettings();
    fetchNotifications();
    if (user?.role === 'super_admin' || user?.role === 'branch_manager') {
      fetchAuditLogs();
      fetchSettingsUsers();
      fetchServiceCatalog();
    }
  };

  // ── Role metadata ─────────────────────────────────────────────────────────
  const ROLE_META: Record<string, { label: string; bg: string; desc: string }> = {
    super_admin:    { label: 'Super Admin',     bg: 'bg-purple-100 text-purple-800', desc: 'Full access to all branches and system configuration' },
    branch_manager: { label: 'Branch Manager',  bg: 'bg-blue-100 text-blue-800',    desc: 'Manages their assigned branch — inventory, staff, reports' },
    staff:          { label: 'Staff',           bg: 'bg-green-100 text-green-800',  desc: 'Operational staff with standard transactional access' },
    cashier:        { label: 'Cashier',         bg: 'bg-amber-100 text-amber-800',  desc: 'Point-of-sale and payment processing access' },
  };

  const isAdmin = user?.role === 'super_admin' || user?.role === 'branch_manager';
  const tabCount = isAdmin ? 4 : 2;
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Initials derived from user name (e.g. "John Doe" → "JD")
  const initials = (user?.name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w: string) => w[0].toUpperCase())
    .join('') || (user?.username?.[0]?.toUpperCase() ?? '?');

  // Role badge metadata
  const roleMeta: { label: string; bg: string; desc?: string } = (() => {
    switch (user?.role) {
      case 'super_admin':
        return { label: 'Super Admin', bg: 'bg-purple-100 text-purple-700', desc: 'Full system access' };
      case 'branch_manager':
        return { label: 'Branch Manager', bg: 'bg-blue-100 text-blue-700', desc: 'Manage branch operations' };
      case 'cashier':
        return { label: 'Cashier', bg: 'bg-green-100 text-green-700', desc: 'Sales & POS access' };
      default:
        return { label: user?.role ?? 'Staff', bg: 'bg-slate-100 text-slate-600' };
    }
  })();

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your account and view activity logs</p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshData} className="gap-1.5">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* ── Tabs ── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full bg-muted border border-border rounded-lg p-1 mb-6" style={{ gridTemplateColumns: `repeat(${tabCount}, 1fr)` }}>
            <TabsTrigger value="account" className="rounded-md data-[state=active]:bg-[#714B67] data-[state=active]:text-white">
              <SettingsIcon className="h-4 w-4 mr-2" />
              My Profile
            </TabsTrigger>
            <TabsTrigger value="activity" className="rounded-md data-[state=active]:bg-[#714B67] data-[state=active]:text-white">
              <Bell className="h-4 w-4 mr-2" />
              Activity
              {unreadCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full leading-none">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="services" className="rounded-md data-[state=active]:bg-[#714B67] data-[state=active]:text-white">
                <Plus className="h-4 w-4 mr-2" />
                Services
              </TabsTrigger>
            )}
            {isAdmin && (
              <TabsTrigger value="users" className="rounded-md data-[state=active]:bg-[#714B67] data-[state=active]:text-white">
                <Users className="h-4 w-4 mr-2" />
                Users
              </TabsTrigger>
            )}
          </TabsList>

          {/* ══════════════ PROFILE TAB ══════════════ */}
          <TabsContent value="account" className="space-y-6">
            <div className="grid md:grid-cols-[280px_1fr] gap-6 items-start">

              {/* ── Identity sidebar ── */}
              <Card className="border border-border sticky top-6">
                <CardContent className="pt-6 space-y-4">
                  {/* Avatar + name */}
                  <div className="flex flex-col items-center text-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#714B67] to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg">
                      {initials}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-base">{user?.name}</p>
                      <p className="text-sm text-muted-foreground">@{user?.username}</p>
                    </div>
                    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${roleMeta.bg}`}>
                      {roleMeta.label}
                    </span>
                    {roleMeta.desc && (
                      <p className="text-xs text-slate-500 leading-snug">{roleMeta.desc}</p>
                    )}
                  </div>

                  <Separator />

                  {/* Read-only details */}
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role</span>
                      <span className="font-medium text-slate-800 capitalize">{(user?.role ?? '').replace('_', ' ')}</span>
                    </div>
                    {user?.branch_id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Branch ID</span>
                        <span className="font-mono text-xs text-slate-700">{user.branch_id.slice(0, 8)}…</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account ID</span>
                      <span className="font-mono text-xs text-slate-700">{(user?.user_id ?? '').slice(0, 8)}…</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Edit forms ── */}
              <div className="space-y-6">
                {/* Profile fields */}
                <Card className="border border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <SettingsIcon className="h-4 w-4 text-indigo-600" />
                      Profile Information
                    </CardTitle>
                    <CardDescription>Update your display name and login username.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-slate-700 font-medium">Full Name <span className="text-red-500">*</span></Label>
                        <Input
                          id="fullName"
                          value={name}
                          onChange={(e) => {
                            setName(e.target.value);
                            setNameError(validateShortText(e.target.value, { label: 'Full name', required: true, minLength: 2, maxLength: 100 }));
                          }}
                          maxLength={100}
                          placeholder="Your full name"
                          aria-invalid={!!nameError}
                          className={`border-slate-300 focus:border-indigo-400 transition-all duration-300${nameError ? ' border-red-400 focus:border-red-400' : ''}`}
                        />
                        {nameError && <p className="text-xs text-red-500">⚠ {nameError}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-slate-700 font-medium">Username <span className="text-red-500">*</span></Label>
                        <Input
                          id="username"
                          value={username}
                          onChange={(e) => {
                            setUsername(e.target.value);
                            setUsernameError(validateShortText(e.target.value, { label: 'Username', required: true, minLength: 2, maxLength: 50 }));
                          }}
                          maxLength={50}
                          placeholder="Login username"
                          aria-invalid={!!usernameError}
                          className={`border-slate-300 focus:border-indigo-400 transition-all duration-300${usernameError ? ' border-red-400 focus:border-red-400' : ''}`}
                        />
                        {usernameError && <p className="text-xs text-red-500">⚠ {usernameError}</p>}
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleSaveChanges}
                        disabled={isSaving || !!nameError || !!usernameError}
                        className="bg-[#714B67] hover:bg-[#5a3c53] text-white px-6"
                      >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Save Profile
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Password change */}
                <Card className="border border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Shield className="h-4 w-4 text-indigo-600" />
                      Change Password
                    </CardTitle>
                    <CardDescription>Leave both fields blank if you do not want to change your password.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="new-password" className="text-slate-700 font-medium">New Password</Label>
                        <div className="relative">
                          <Input
                            id="new-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave blank to keep current"
                            className="border-slate-300 focus:border-indigo-400 transition-all duration-300 pr-10"
                          />
                          <button type="button" onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {password && <PasswordStrengthIndicator password={password} />}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password" className="text-slate-700 font-medium">Confirm New Password</Label>
                        <div className="relative">
                          <Input
                            id="confirm-password"
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Repeat new password"
                            className={`border-slate-300 focus:border-indigo-400 transition-all duration-300 pr-10${confirmPassword && password !== confirmPassword ? ' border-red-300 focus:border-red-400' : ''}`}
                          />
                          <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors">
                            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        {confirmPassword && password !== confirmPassword && (
                          <p className="text-xs text-red-500 flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Passwords do not match
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        onClick={handleSaveChanges}
                        disabled={isSaving || !password}
                        className="bg-[#714B67] hover:bg-[#5a3c53] text-white px-6"
                      >
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Change Password
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ══════════════ ACTIVITY TAB ══════════════ */}
          <TabsContent value="activity" className="space-y-6">

            {/* Notifications */}
            <Card className="border border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5 text-indigo-600" />
                      Notifications
                      {unreadCount > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-red-500 text-white rounded-full">
                          {unreadCount}
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription>System alerts and updates for your account.</CardDescription>
                  </div>
                  {unreadCount > 0 && (
                    <Button variant="outline" size="sm" onClick={markAllAsRead} className="gap-1.5 text-xs">
                      <CheckCircle className="h-3.5 w-3.5" />
                      Mark all read
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {notifError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{notifError}</AlertDescription>
                  </Alert>
                )}
                {isNotifLoading ? (
                  <div className="flex items-center gap-2 py-8 text-muted-foreground justify-center text-sm">
                    <Loader2 className="h-5 w-5 animate-spin" /> Loading notifications…
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="text-center py-10">
                    <Bell className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">All caught up!</p>
                    <p className="text-xs text-muted-foreground mt-1">No notifications right now.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {notifications.map((n) => (
                      <div
                        key={n.notification_id}
                        className={`flex items-start justify-between gap-3 p-3 rounded-lg border transition-colors ${
                          !n.is_read ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="mt-0.5 shrink-0">{getNotificationIcon(n.type)}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-sm text-slate-800">{n.title}</p>
                              {!n.is_read && (
                                <Badge className="text-[10px] px-1.5 py-0 bg-indigo-600 hover:bg-indigo-600">New</Badge>
                              )}
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {new Date(n.created_at || '').toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!n.is_read && (
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-100"
                              title="Mark as read" onClick={() => markAsRead(n.notification_id)}>
                              <CheckCircle className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            title="Dismiss" onClick={() => deleteNotification(n.notification_id)}>
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Audit Logs — admins only */}
            {(user?.role === 'super_admin' || user?.role === 'branch_manager') && (
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-indigo-600" />
                    Audit Logs
                  </CardTitle>
                  <CardDescription>Last 50 system events across all users and tables.</CardDescription>
                </CardHeader>
                <CardContent>
                  {auditError && (
                    <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{auditError}</AlertDescription>
                    </Alert>
                  )}
                  {isAuditLoading ? (
                    <div className="flex items-center gap-2 py-8 text-muted-foreground justify-center text-sm">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading audit log…
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-10">
                      <History className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No audit events yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Action</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Table</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">User</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {auditLogs.map((log) => (
                            <tr key={log.log_id} className="hover:bg-slate-50">
                              <td className="px-3 py-2">
                                <Badge variant="outline" className={`text-[10px] capitalize ${
                                  log.action === 'INSERT' ? 'bg-green-50 text-green-700 border-green-200' :
                                  log.action === 'UPDATE' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                  log.action === 'DELETE' ? 'bg-red-50 text-red-700 border-red-200' :
                                  'bg-slate-50 text-slate-600 border-slate-200'
                                }`}>{log.action}</Badge>
                              </td>
                              <td className="px-3 py-2 text-slate-600 font-mono text-xs">{log.table_name}</td>
                              <td className="px-3 py-2 text-slate-800">{log.user?.name || 'System'}</td>
                              <td className="px-3 py-2 text-slate-400 text-xs whitespace-nowrap">
                                {new Date(log.created_at || '').toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ══════════════ SERVICES TAB ══════════════ */}
          {isAdmin && (
            <TabsContent value="services" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[360px_1fr] items-start">
                <Card className="border border-border">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Plus className="h-4 w-4 text-indigo-600" />
                      {catalogId ? 'Edit Service' : 'Add Service'}
                    </CardTitle>
                    <CardDescription>
                      Manage the service catalog used by the New Service Job dialog.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">Service Name <span className="text-red-500">*</span></Label>
                      <Input
                        value={catalogName}
                        onChange={(e) => {
                          setCatalogName(e.target.value);
                          setCatalogNameError(validateShortText(e.target.value, { label: 'Service name', required: true, minLength: 2, maxLength: 100 }));
                        }}
                        maxLength={100}
                        placeholder="Tire Rotation"
                        aria-invalid={!!catalogNameError}
                        className={catalogNameError ? 'border-red-400 focus:border-red-400' : ''}
                      />
                      {catalogNameError && <p className="text-xs text-red-500">⚠ {catalogNameError}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">SKU / Code</Label>
                      <Input
                        value={catalogSku}
                        onChange={(e) => setCatalogSku(e.target.value)}
                        maxLength={64}
                        placeholder="TIRE_ROTATION"
                      />
                      <p className="text-[11px] text-muted-foreground">Optional internal code for quick identification.</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-700 font-medium">Sale Price <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={catalogPrice}
                        onChange={(e) => {
                          setCatalogPrice(e.target.value);
                          setCatalogPriceError(validateNumber(e.target.value, { label: 'Sale price', required: true, min: 0 }));
                        }}
                        placeholder="150"
                        aria-invalid={!!catalogPriceError}
                        className={catalogPriceError ? 'border-red-400 focus:border-red-400' : ''}
                      />
                      {catalogPriceError && <p className="text-xs text-red-500">⚠ {catalogPriceError}</p>}
                    </div>

                    <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                      Category is fixed to <span className="font-semibold text-slate-700">service</span> for this catalog.
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 pt-2">
                      <Button
                        onClick={handleCatalogSave}
                        disabled={isCatalogLoading}
                        className="bg-[#714B67] hover:bg-[#5a3c53] text-white flex-1"
                      >
                        {isCatalogLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {catalogId ? 'Update Service' : 'Save Service'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetCatalogForm}
                        disabled={isCatalogLoading && !catalogId}
                        className="flex-1"
                      >
                        Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-border">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <PencilLine className="h-4 w-4 text-indigo-600" />
                          Service Catalog
                        </CardTitle>
                        <CardDescription>Items shown in the New Service Job service picker.</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={fetchServiceCatalog} className="gap-1.5">
                        <RotateCcw className="h-3.5 w-3.5" />
                        Reload
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {catalogError && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{catalogError}</AlertDescription>
                      </Alert>
                    )}
                    {isCatalogLoading && serviceCatalog.length === 0 ? (
                      <div className="flex items-center gap-2 py-8 text-muted-foreground justify-center text-sm">
                        <Loader2 className="h-5 w-5 animate-spin" /> Loading services…
                      </div>
                    ) : serviceCatalog.length === 0 ? (
                      <div className="text-center py-10">
                        <PencilLine className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">No services found</p>
                        <p className="text-xs text-muted-foreground mt-1">Add the first service using the form on the left.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Service</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">SKU</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Price</th>
                              <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {serviceCatalog.map((item) => {
                              const itemId = String(item.item_id);
                              const itemName = String(item.name);
                              const itemSku = String(item.sku ?? '');
                              const itemPrice = Number(item.sale_price ?? 0);
                              return (
                                <tr key={itemId} className="hover:bg-slate-50">
                                  <td className="px-3 py-2 font-medium text-slate-800">{itemName}</td>
                                  <td className="px-3 py-2 font-mono text-xs text-slate-600">{itemSku || '—'}</td>
                                  <td className="px-3 py-2 text-slate-700">P{itemPrice.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
                                  <td className="px-3 py-2">
                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                        title="Edit"
                                        onClick={() => startEditCatalogItem(item)}
                                      >
                                        <PencilLine className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        title="Archive"
                                        onClick={() => handleCatalogArchive(itemId)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}

          {/* ══════════════ USERS TAB ══════════════ */}
          {isAdmin && (
            <TabsContent value="users" className="space-y-6">
              <Card className="border border-border">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-indigo-600" />
                        System Users
                      </CardTitle>
                      <CardDescription>All users with access to this system.</CardDescription>
                    </div>
                    <Link href="/admin">
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Full User Management
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  {usersError && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>{usersError}</AlertDescription>
                    </Alert>
                  )}
                  {isUsersLoading ? (
                    <div className="flex items-center gap-2 py-8 text-muted-foreground justify-center text-sm">
                      <Loader2 className="h-5 w-5 animate-spin" /> Loading users…
                    </div>
                  ) : settingsUsers.length === 0 ? (
                    <div className="text-center py-10">
                      <Users className="h-12 w-12 text-slate-200 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">No users found</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Name</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Username</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Role</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-slate-600">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {settingsUsers.map((u) => {
                            const meta = ROLE_META[String(u.role ?? '')] ?? { label: String(u.role ?? '—'), bg: 'bg-slate-100 text-slate-700' };
                            const isActive = u.is_active !== false;
                            return (
                              <tr key={String(u.user_id)} className="hover:bg-slate-50">
                                <td className="px-3 py-2 font-medium text-slate-800">{String(u.name ?? '—')}</td>
                                <td className="px-3 py-2 font-mono text-xs text-slate-600">@{String(u.username ?? '—')}</td>
                                <td className="px-3 py-2">
                                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${meta.bg}`}>{meta.label}</span>
                                </td>
                                <td className="px-3 py-2">
                                  {isActive ? (
                                    <span className="inline-flex items-center gap-1 text-green-700 text-xs font-medium">
                                      <UserCheck className="h-3.5 w-3.5" /> Active
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-slate-400 text-xs font-medium">
                                      <UserX className="h-3.5 w-3.5" /> Inactive
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* ── Password Verification Dialog ── */}
      <Dialog open={isVerifyDialogOpen} onOpenChange={setIsVerifyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-indigo-600" />
              Verify Your Identity
            </DialogTitle>
            <DialogDescription>
              Enter your current password to confirm password change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="old-password" className="text-slate-700 font-medium">Current Password</Label>
              <Input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Enter your current password"
                className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                disabled={isVerifying}
                onKeyDown={e => e.key === 'Enter' && !isVerifying && oldPassword && handleVerifyAndSave()}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsVerifyDialogOpen(false); setOldPassword(''); }} disabled={isVerifying}>
              Cancel
            </Button>
            <Button onClick={handleVerifyAndSave} disabled={isVerifying || !oldPassword} className="bg-[#714B67] hover:bg-[#5a3c53] text-white">
              {isVerifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Verifying…</> : 'Confirm & Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}