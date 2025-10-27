
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
import { Loader2, AlertTriangle, Settings as SettingsIcon, Shield, History, DollarSign, Bell } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { SystemSetting, AuditLog } from '@/lib/types';

export default function SettingsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('account');

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
          // Optionally, you might want to re-fetch the user or update the auth context
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


  if (isAuthLoading) {
    return (
       <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex justify-center items-center h-full">
         <Loader2 className="h-8 w-8 animate-spin" />
       </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <PageHeader title="Settings" description="Manage your application and account settings." />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
          {user?.role === 2 && <TabsTrigger value="audit">Audit Logs</TabsTrigger>}
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>Update your personal details and password.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input id="fullName" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} />
                </div>
              </div>
               <Separator />
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                      <Label htmlFor="new-password">New Password</Label>
                      <Input id="new-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Leave blank to keep current password" />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="confirm-password">Confirm New Password</Label>
                      <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm your new password" />
                  </div>
              </div>
              <Button onClick={handleSaveChanges} disabled={isSaving}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Manage how you receive notifications. (This is a visual demo)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="emailNotifications" className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive important updates and alerts via email.
                  </p>
                </div>
                <Switch id="emailNotifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="lowStockAlerts" className="text-base">Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when inventory items are running low.
                  </p>
                </div>
                <Switch id="lowStockAlerts" defaultChecked />
              </div>
              <Button disabled>Save Notification Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure system-wide settings and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {settingsError && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{settingsError}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="vat-rate">VAT Rate (%)</Label>
                  <Input 
                    id="vat-rate" 
                    type="number" 
                    step="0.01"
                    value={vatRate} 
                    onChange={(e) => setVatRate(e.target.value)} 
                    placeholder="12.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="low-stock-threshold">Low Stock Threshold</Label>
                  <Input 
                    id="low-stock-threshold" 
                    type="number" 
                    value={lowStockThreshold} 
                    onChange={(e) => setLowStockThreshold(e.target.value)} 
                    placeholder="10"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-lg font-medium">Company Information</h4>
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input 
                    id="company-name" 
                    value={companyName} 
                    onChange={(e) => setCompanyName(e.target.value)} 
                    placeholder="Q.R Tire Supply & Vulcanizing Shop"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-address">Company Address</Label>
                  <Input 
                    id="company-address" 
                    value={companyAddress} 
                    onChange={(e) => setCompanyAddress(e.target.value)} 
                    placeholder="123 Main Street, City"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Company Phone</Label>
                  <Input 
                    id="company-phone" 
                    value={companyPhone} 
                    onChange={(e) => setCompanyPhone(e.target.value)} 
                    placeholder="+1-555-0101"
                  />
                </div>
              </div>

              <Button onClick={handleSaveSystemSettings} disabled={isSaving || isSettingsLoading}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save System Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {user?.role === 2 && (
          <TabsContent value="audit" className="space-y-6">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>View system activity and user actions.</CardDescription>
              </CardHeader>
              <CardContent>
                {auditError && (
                  <Alert variant="destructive" className="mb-4">
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
                      <p className="text-muted-foreground text-center py-8">No audit logs found.</p>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.log_id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Shield className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium">{log.action}</p>
                              <p className="text-sm text-muted-foreground">
                                {log.table_name} • {log.users?.name || 'System'} • {new Date(log.created_at || '').toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline">{log.action}</Badge>
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
  );
}
