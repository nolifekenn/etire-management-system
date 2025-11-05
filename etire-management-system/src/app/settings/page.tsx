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
import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Settings as SettingsIcon, Shield, History, DollarSign, Bell, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SystemSetting, AuditLog } from '@/lib/types';

// Design system from POS page (keeping the button styles and animations)
const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg",
  secondary: "flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300"
};

const microAnimations = {
  fadeIn: "animate-in fade-in duration-500",
  iconHover: "transition-all duration-350 group-hover:scale-105 group-hover:translate-y-[-2px]",
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

  // System settings state
  const [systemSettings, setSystemSettings] = useState<SystemSetting[]>([]);
  const [isSettingsLoading, setIsSettingsLoading] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  // System settings form state
  const [vatRate, setVatRate] = useState('');
  const [lowStockThreshold, setLowStockThreshold] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');

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
      data?.forEach(setting => {
        switch (setting.key) {
          case 'vat_rate':
            setVatRate(setting.value || '');
            break;
          case 'low_stock_threshold':
            setLowStockThreshold(setting.value || '');
            break;
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

  useEffect(() => {
    fetchSystemSettings();
    if (user?.role === 2) { // Only admins can see audit logs
      fetchAuditLogs();
    }
  }, [fetchSystemSettings, fetchAuditLogs, user]);

  const handleSaveChanges = async () => {
      if (!user || !supabase) {
          toast({ title: "Error", description: "You must be logged in to change settings.", variant: "destructive" });
          return;
      }
      if (password && password !== confirmPassword) {
          toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
          return;
      }

      setIsSaving(true);
      const updateData: { name: string; username: string; password?: string } = {
          name,
          username,
      };

      if (password) {
          updateData.password = password;
      }

      const { error } = await supabase
          .from('user')
          .update(updateData)
          .eq('user_id', user.user_id);

      if (error) {
          toast({ title: "Save Error", description: error.message, variant: "destructive" });
      } else {
          toast({ title: "Success", description: "Your settings have been updated. Changes will be reflected on next login." });
          setPassword('');
          setConfirmPassword('');
      }
      setIsSaving(false);
  };

  const handleSaveSystemSettings = async () => {
      if (!user || !supabase) return;
      setIsSaving(true);

      try {
          const settings = [
              { key: 'vat_rate', value: vatRate },
              { key: 'low_stock_threshold', value: lowStockThreshold },
              { key: 'company_name', value: companyName },
              { key: 'company_address', value: companyAddress },
              { key: 'company_phone', value: companyPhone },
          ];

          for (const setting of settings) {
              const { error } = await supabase
                  .from('system_settings')
                  .upsert({
                      key: setting.key,
                      value: setting.value,
                      updated_by: user.user_id,
                  });

              if (error) {
                  throw error;
              }
          }

          toast({ title: "Success", description: "System settings updated successfully." });
          fetchSystemSettings();
      } catch (error: any) {
          toast({ title: "Save Error", description: error.message, variant: "destructive" });
      } finally {
          setIsSaving(false);
      }
  };

  const refreshData = () => {
    fetchSystemSettings();
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
                       gridTemplateColumns: user?.role === 2 ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)' 
                     }}>
              <TabsTrigger 
                value="account" 
                className="rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <SettingsIcon className="h-4 w-4 mr-2" />
                Account
              </TabsTrigger>
              <TabsTrigger 
                value="system"
                className="rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
              >
                <Shield className="h-4 w-4 mr-2" />
                System
              </TabsTrigger>
              {user?.role === 2 && (
                <TabsTrigger 
                  value="audit"
                  className="rounded-xl transition-all duration-300 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                >
                  <History className="h-4 w-4 mr-2" />
                  Audit Logs
                </TabsTrigger>
              )}
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
                      <Input 
                        id="new-password" 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        placeholder="Leave blank to keep current password"
                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-slate-700 font-medium">Confirm New Password</Label>
                      <Input 
                        id="confirm-password" 
                        type="password" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        placeholder="Confirm your new password"
                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                      />
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
              
              {/* Notification Settings Card */}
              <Card className={`bg-white border-slate-200 shadow-lg ${microAnimations.cardHover}`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-indigo-600" />
                    Notification Settings
                  </CardTitle>
                  <CardDescription>Manage how you receive notifications. (This is a visual demo)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between space-x-2 rounded-lg border border-slate-200 p-4 hover:border-indigo-400 transition-all duration-300">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailNotifications" className="text-base text-slate-800">Email Notifications</Label>
                      <p className="text-sm text-slate-600">
                        Receive important updates and alerts via email.
                      </p>
                    </div>
                    <Switch id="emailNotifications" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between space-x-2 rounded-lg border border-slate-200 p-4 hover:border-indigo-400 transition-all duration-300">
                    <div className="space-y-0.5">
                      <Label htmlFor="lowStockAlerts" className="text-base text-slate-800">Low Stock Alerts</Label>
                      <p className="text-sm text-slate-600">
                        Notify when inventory items are running low.
                      </p>
                    </div>
                    <Switch id="lowStockAlerts" defaultChecked />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button
                      disabled
                      className={`${buttonStyles.primary} ml-auto w-auto px-6`}
                      onClick={() => toast({
                        title: "Demo Feature",
                        description: "Notification settings are not implemented yet."
                      })}
                    >
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Notification Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="system" className="space-y-6">
              <Card className={`bg-white border-slate-200 shadow-lg`}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-indigo-600" />
                    System Settings
                  </CardTitle>
                  <CardDescription>Configure system-wide settings and preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {settingsError && (
                    <Alert variant="destructive" className="border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{settingsError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="vat-rate" className="text-slate-700 font-medium">VAT Rate (%)</Label>
                      <Input 
                        id="vat-rate" 
                        type="number" 
                        step="0.01"
                        value={vatRate} 
                        onChange={(e) => setVatRate(e.target.value)} 
                        placeholder="12.00"
                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="low-stock-threshold" className="text-slate-700 font-medium">Low Stock Threshold</Label>
                      <Input 
                        id="low-stock-threshold" 
                        type="number" 
                        value={lowStockThreshold} 
                        onChange={(e) => setLowStockThreshold(e.target.value)} 
                        placeholder="10"
                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300"
                      />
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
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button
                      onClick={handleSaveSystemSettings}
                      disabled={isSaving || isSettingsLoading}
                      className={`${buttonStyles.primary} ml-auto w-auto px-6`}
                    >
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save System Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {user?.role === 2 && (
              <TabsContent value="audit" className="space-y-6">
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
                                    {log.table_name} • {log.users?.name || 'System'} • {new Date(log.created_at || '').toLocaleString()}
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
              </TabsContent>
            )}
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