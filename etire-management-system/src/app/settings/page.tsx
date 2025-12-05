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
import { Loader2, AlertTriangle, Settings as SettingsIcon, Shield, History, DollarSign, Bell, RefreshCw, CheckCircle, XCircle, Info, Palette, Globe, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SystemSetting, AuditLog, Notification } from '@/lib/types';

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

      <div className="grid grid-cols-2 gap-2">
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

  // System settings form state
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

  // Common settings state (Placeholders)
  const [theme, setTheme] = useState('light');
  const [language, setLanguage] = useState('en');

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
      (data as SystemSetting[])?.forEach(setting => {
        switch (setting.key) {
          case 'company_name':
            setCompanyName(setting.value || '');
            break;
          case 'company_address':
            setCompanyAddress(setting.value || '');
            break;
          case 'company_phone':
            setCompanyPhone(setting.value || '');
            break;
        }
      });
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
      .order('created_at', { ascending: false });

    if (error) {
      setNotifError(`Could not fetch notifications: ${error.message}`);
      setNotifications([]);
    } else {
      setNotifications(data as Notification[]);
      setNotifError(null);
    }
    setIsNotifLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSystemSettings();
    fetchNotifications();
    if (user?.role === 2 || user?.role === 3) { // Only admins and managers can see audit logs
      fetchAuditLogs();
    }
  }, [fetchSystemSettings, fetchAuditLogs, fetchNotifications, user]);

  const handleSaveChanges = async () => {
    if (!user || !supabase) {
      toast({ title: "Error", description: "You must be logged in to change settings.", variant: "destructive" });
      return;
    }

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

  const handleSaveSystemSettings = async () => {
    if (!user || !supabase) return;
    setIsSaving(true);

    try {
      const settings = [
        { key: 'company_name', value: companyName },
        { key: 'company_address', value: companyAddress },
        { key: 'company_phone', value: companyPhone },
      ];

      for (const setting of settings) {
        const { error } = await (supabase
          .from('system_settings') as any)
          .upsert({
            key: setting.key,
            value: setting.value,
            updated_by: user.user_id,
          });

        if (error) {
          throw error;
        }
      }

      toast({ title: "Success", description: "Company information updated successfully." });
      fetchSystemSettings();
    } catch (error: any) {
      toast({ title: "Save Error", description: error.message, variant: "destructive" });
    } finally {
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
    const { error } = await (supabase
      .from('notification') as any)
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

  const refreshData = () => {
    fetchSystemSettings();
    fetchNotifications();
    if (user?.role === 2) {
      fetchAuditLogs();
    }
  };

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-white text-slate-800 font-poppins">
        <div className="container mx-auto p-6 sm:p-8 lg:p-10 flex justify-center items-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 font-poppins">
      <div className="container mx-auto p-6 sm:p-8 lg:p-10">
        {/* Clean Header Section - Simplified for Settings */}
        <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 flex items-center justify-between shadow-xl">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white mb-2 font-poppins tracking-tight">
                System Settings
              </h1>
              <div className="flex items-center gap-6 text-white/90">
                <p className="flex items-center gap-3 text-lg font-medium">
                  <SettingsIcon className="h-5 w-5 opacity-90" />
                  Manage your application and account settings
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className={`transition-all duration-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full bg-white border border-slate-200 rounded-2xl p-1 mb-6 shadow-sm"
              style={{
                gridTemplateColumns: 'repeat(3, 1fr)'
              }}>
              <TabsTrigger
                value="account"
                className="rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger
                value="general"
                className="rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <Shield className="h-4 w-4 mr-2" />
                General
              </TabsTrigger>
              <TabsTrigger
                value="activity"
                className="rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <History className="h-4 w-4 mr-2" />
                Activity Logs
              </TabsTrigger>
            </TabsList>

            <TabsContent value="account" className="space-y-6">
              {/* Account Information Card */}
              <Card className="bg-white border-slate-200 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="h-5 w-5 text-indigo-600" />
                    Account Information
                  </CardTitle>
                  <CardDescription>Update your personal details and password.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-slate-700 font-medium">Full Name</Label>
                      <Input
                        id="fullName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username" className="text-slate-700 font-medium">Username</Label>
                      <Input
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                      />
                    </div>
                  </div>

                  <Separator className="bg-slate-200" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-slate-700 font-medium">New Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Leave blank to keep current password"
                          className="border-slate-300 focus:border-indigo-400 transition-all duration-300 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
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
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your new password"
                          className={`border-slate-300 focus:border-indigo-400 transition-all duration-300 pr-10 ${confirmPassword && password !== confirmPassword ? 'border-red-300 focus:border-red-400' : ''}`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                          <XCircle className="h-3 w-3" /> Passwords do not match
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveChanges}
                      disabled={isSaving}
                      className={`${buttonStyles.primary} ml-auto w-auto px-6`}
                    >
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="general" className="space-y-6">
              <Card className={`bg-white border-slate-200 shadow-lg`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-600" />
                    General Settings
                  </CardTitle>
                  <CardDescription>Configure application preferences and company details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {settingsError && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{settingsError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                      <Palette className="h-4 w-4 text-indigo-600" />
                      Appearance & Preferences
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="theme" className="text-slate-700 font-medium">Theme</Label>
                        <div className="flex items-center gap-4">
                          <Button variant={theme === 'light' ? 'default' : 'outline'} onClick={() => setTheme('light')} className="w-full">Light</Button>
                          <Button variant={theme === 'dark' ? 'default' : 'outline'} onClick={() => setTheme('dark')} className="w-full" disabled>Dark (Coming Soon)</Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="language" className="text-slate-700 font-medium">Language</Label>
                        <div className="flex items-center gap-4">
                          <Button variant={language === 'en' ? 'default' : 'outline'} onClick={() => setLanguage('en')} className="w-full">English</Button>
                          <Button variant={language === 'fil' ? 'default' : 'outline'} onClick={() => setLanguage('fil')} className="w-full" disabled>Filipino (Coming Soon)</Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator className="bg-slate-200" />

                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-slate-800 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-indigo-600" />
                      Company Information
                    </h4>
                    <div className="space-y-2">
                      <Label htmlFor="company-name" className="text-slate-700 font-medium">Company Name</Label>
                      <Input
                        id="company-name"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="Q.R Tire Supply & Vulcanizing Shop"
                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                        disabled={user?.role !== 3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-address" className="text-slate-700 font-medium">Company Address</Label>
                      <Input
                        id="company-address"
                        value={companyAddress}
                        onChange={(e) => setCompanyAddress(e.target.value)}
                        placeholder="123 Main Street, City"
                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                        disabled={user?.role !== 3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company-phone" className="text-slate-700 font-medium">Company Phone</Label>
                      <Input
                        id="company-phone"
                        value={companyPhone}
                        onChange={(e) => setCompanyPhone(e.target.value)}
                        placeholder="+1-555-0101"
                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                        disabled={user?.role !== 3}
                      />
                    </div>
                  </div>

                  {user?.role === 3 && (
                    <div className="flex justify-end">
                      <Button
                        onClick={handleSaveSystemSettings}
                        disabled={isSaving || isSettingsLoading}
                        className={`${buttonStyles.primary} ml-auto w-auto px-6`}
                      >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save General Settings
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity" className="space-y-6">
              {/* Notifications Section */}
              <Card className={`bg-white border-slate-200 shadow-lg ${microAnimations.cardHover}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-indigo-600" />
                    Notifications
                  </CardTitle>
                  <CardDescription>Recent alerts and updates.</CardDescription>
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
                    <div className="flex justify-center items-center h-32">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {notifications.length === 0 ? (
                        <div className="text-center py-8">
                          <Bell className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                          <p className="text-slate-500">No new notifications</p>
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.notification_id}
                            className={`flex items-start justify-between p-4 border rounded-lg transition-all duration-300 ${!notification.is_read ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200'
                              }`}
                          >
                            <div className="flex items-start space-x-3">
                              {getNotificationIcon(notification.type)}
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-slate-800">{notification.title}</p>
                                  {!notification.is_read && (
                                    <Badge variant="default" className="text-xs bg-indigo-600">New</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-slate-600 mt-1">{notification.message}</p>
                                <p className="text-xs text-slate-400 mt-2">
                                  {new Date(notification.created_at || '').toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {!notification.is_read && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => markAsRead(notification.notification_id)}
                                  title="Mark as read"
                                >
                                  <CheckCircle className="h-4 w-4 text-indigo-600" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteNotification(notification.notification_id)}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                title="Delete"
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {(user?.role === 2 || user?.role === 3) && (
                <Card className={`bg-white border-slate-200 shadow-lg ${microAnimations.cardHover}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-indigo-600" />
                      Audit Logs
                    </CardTitle>
                    <CardDescription>View system activity and user actions.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {auditError && (
                      <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{auditError}</AlertDescription>
                      </Alert>
                    )}

                    {isAuditLoading ? (
                      <div className="flex justify-center items-center h-32">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {auditLogs.length === 0 ? (
                          <div className="text-center py-12">
                            <History className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                            <p className="text-slate-500 text-lg">No audit logs found</p>
                            <p className="text-slate-400 text-sm">System activity will appear here</p>
                          </div>
                        ) : (
                          auditLogs.map((log) => (
                            <div
                              key={log.log_id}
                              className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-indigo-400 hover:shadow-md transition-all duration-300"
                            >
                              <div className="flex items-center space-x-3">
                                <Shield className="h-4 w-4 text-indigo-600" />
                                <div>
                                  <p className="font-medium text-slate-800">{log.action}</p>
                                  <p className="text-sm text-slate-600">
                                    {log.table_name} • {log.user?.name || 'System'} • {new Date(log.created_at || '').toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className="bg-indigo-50 text-indigo-700 border-indigo-200"
                              >
                                {log.action}
                              </Badge>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
        
        .font-poppins {
          font-family: 'Poppins', sans-serif;
        }

        .ease-spring {
          transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
}