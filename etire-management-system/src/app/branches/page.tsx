"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, PlusCircle, AlertTriangle, Building2, Users, MapPin, Phone, Mail, 
  RefreshCw, Clock, Edit, Trash2, Search, Filter, X, Eye, CheckCircle, XCircle,
  UserCheck, UserX, Target, Sparkles, ArrowLeft, Check, Package, ArrowUpDown,
  ChevronDown, Save, Archive, ArrowRight, Download, TrendingUp, DollarSign
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Branch, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ===== DESIGN SYSTEM =====
const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins ripple",
  secondary: "flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95 font-poppins ripple",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg font-poppins ripple",
  back: "flex items-center gap-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-slate-300 hover:border-slate-400 font-poppins"
};

const microAnimations = {
  cardHover: "transition-all duration-350 ease-spring hover:translate-y-[-6px] hover:shadow-2xl",
  buttonHover: "transition-all duration-200 hover:scale-105 active:scale-95",
  fadeIn: "animate-in fade-in duration-500",
  iconHover: "transition-all duration-350 ease-spring group-hover:scale-105 group-hover:translate-y-[-2px]",
};

// Branch Status Colors
const statusColors = {
  active: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200",
  inactive: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
};

// Branch Status Icons
const StatusIcons = {
  active: CheckCircle,
  inactive: XCircle
};

// Color mapping for stats cards
const statColors = {
  total: { from: 'from-purple-500', to: 'to-indigo-600', bgFrom: 'from-purple-50', bgTo: 'to-indigo-50/50' },
  active: { from: 'from-green-500', to: 'to-emerald-600', bgFrom: 'from-green-50', bgTo: 'to-emerald-50/50' },
  inactive: { from: 'from-red-500', to: 'to-rose-600', bgFrom: 'from-red-50', bgTo: 'to-rose-50/50' },
  withManager: { from: 'from-blue-500', to: 'to-cyan-600', bgFrom: 'from-blue-50', bgTo: 'to-cyan-50/50' },
  withoutManager: { from: 'from-amber-500', to: 'to-orange-600', bgFrom: 'from-amber-50', bgTo: 'to-orange-50/50' },
} as const;

// Enhanced Search Input Component (from services.tsx)
const SearchInput = ({ 
  value, 
  onChange, 
  placeholder, 
  id 
}: { 
  value: string; 
  onChange: (value: string) => void; 
  placeholder: string; 
  id: string;
}) => {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useState<NodeJS.Timeout>();

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (newValue: string) => {
    setLocalValue(newValue);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout for debounced update
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 150);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange('');
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  };

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
      <Input 
        id={id}
        placeholder={placeholder} 
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        className="pl-10 pr-4 py-2 border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
      />
      {localValue && (
        <button 
          onClick={handleClear}
          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors duration-200"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};

// ===== BRANCH FORM COMPONENT (Adapted from Service Form) =====
interface BranchFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  formData: {
    name: string;
    address: string;
    phone: string;
    email: string;
    managerId: string;
    isActive: boolean;
    customers?: any[];
    vehicleTypes?: any[];
    inventoryItems?: any[];
  };
  onFormDataChange: (data: any) => void;
  isEdit?: boolean;
}

const BranchForm = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading,
  formData,
  onFormDataChange,
  isEdit = false
}: BranchFormProps) => {
  const [activeTab, setActiveTab] = useState('basic');
  const { customers, vehicleTypes, inventoryItems } = formData;

  const handleNext = () => {
    if (activeTab === 'basic') setActiveTab('review');
  };

  const handleBack = () => {
    if (activeTab === 'review') setActiveTab('basic');
  };

  const isBasicValid = formData.name && formData.name.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-poppins">
            {isEdit ? 'Edit Branch' : 'Create New Branch'}
          </DialogTitle>
          <DialogDescription className="text-slate-600 font-poppins">
            {isEdit ? 'Update the branch details.' : 'Fill in the details for the new branch location.'}
          </DialogDescription>
        </DialogHeader>

        {/* Progress Steps */}
        <div className="flex justify-between mb-6">
          {['Basic Info', 'Review'].map((step, index) => {
            const stepNumber = index + 1;
            const isActive = activeTab === ['basic', 'review'][index];
            const isCompleted = activeTab === 'review' && stepNumber < 2;
            
            return (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${
                  isActive 
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' 
                    : isCompleted 
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                }`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-slate-500'
                }`}>
                  {step}
                </span>
                {index < 1 && (
                  <div className={`w-12 h-1 mx-2 ${
                    isCompleted ? 'bg-green-500' : 'bg-slate-200'
                  }`} />
                )}
              </div>
            );
          })}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Basic Info Tab */}
          <TabsContent value="basic" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-700 font-medium font-poppins">Branch Name *</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })} 
                  placeholder="Main Branch"
                  className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 font-poppins ${
                    formData.name ? "border-green-400" : ""
                  }`}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address" className="text-slate-700 font-medium font-poppins">Address</Label>
                <Textarea 
                  id="address" 
                  value={formData.address} 
                  onChange={(e) => onFormDataChange({ ...formData, address: e.target.value })} 
                  placeholder="123 Main Street, City, State"
                  className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 font-poppins"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-slate-700 font-medium font-poppins">Phone</Label>
                  <Input 
                    id="phone" 
                    value={formData.phone} 
                    onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })} 
                    placeholder="+1-555-0101"
                    className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 font-poppins"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-slate-700 font-medium font-poppins">Email</Label>
                  <Input 
                    id="email" 
                    type="email"
                    value={formData.email} 
                    onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })} 
                    placeholder="branch@company.com"
                    className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 font-poppins"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="manager" className="text-slate-700 font-medium font-poppins">Manager</Label>
                <Select 
                  value={formData.managerId} 
                  onValueChange={(value) => onFormDataChange({ ...formData, managerId: value })}
                >
                  <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 font-poppins">
                    <SelectValue placeholder="Select a manager..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="font-poppins">No Manager</SelectItem>
                    {(customers || []).filter((c: any) => c.user_id && c.role && [1, 2].includes(c.role)).map((manager: any) => (
                      <SelectItem key={manager.user_id} value={manager.user_id} className="font-poppins">
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-lg">
                <Switch 
                  id="is_active" 
                  checked={formData.isActive} 
                  onCheckedChange={(checked) => onFormDataChange({ ...formData, isActive: checked })}
                  className="data-[state=checked]:bg-green-500"
                />
                <Label htmlFor="is_active" className="text-slate-700 font-medium font-poppins">Active Branch</Label>
                {formData.isActive && (
                  <div className="ml-auto flex items-center gap-1 text-green-600">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-sm">Active</span>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Review Tab */}
          <TabsContent value="review" className="space-y-4">
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <h3 className="font-semibold text-slate-800 font-poppins">Branch Summary</h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-slate-600 font-poppins">Branch Name:</span>
                  <p className="font-semibold text-slate-800 font-poppins">{formData.name || 'Not specified'}</p>
                </div>
                
                <div>
                  <span className="text-slate-600 font-poppins">Status:</span>
                  <p className="font-semibold text-slate-800 font-poppins">
                    {formData.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                
                <div className="col-span-2">
                  <span className="text-slate-600 font-poppins">Address:</span>
                  <p className="font-semibold text-slate-800 font-poppins">
                    {formData.address || 'No address provided'}
                  </p>
                </div>
                
                <div>
                  <span className="text-slate-600 font-poppins">Phone:</span>
                  <p className="font-semibold text-slate-800 font-poppins">
                    {formData.phone || 'Not provided'}
                  </p>
                </div>
                
                <div>
                  <span className="text-slate-600 font-poppins">Email:</span>
                  <p className="font-semibold text-slate-800 font-poppins">
                    {formData.email || 'Not provided'}
                  </p>
                </div>
                
                <div className="col-span-2">
                  <span className="text-slate-600 font-poppins">Manager:</span>
                  <p className="font-semibold text-slate-800 font-poppins">
                    {formData.managerId === 'none' || !formData.managerId 
                      ? 'No manager assigned' 
                      : (customers || []).find((c: any) => c.user_id === formData.managerId)?.name || 'Unknown Manager'}
                  </p>
                </div>
              </div>
            </div>

            {/* Status Summary */}
            <div className="space-y-3 p-4 bg-gradient-to-br from-slate-50 to-purple-50 rounded-xl border-2 border-purple-200">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-600 font-poppins">Branch Status:</span>
                <Badge className={`font-semibold ${formData.isActive ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                  {formData.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
              
              <div className="h-px bg-slate-300"></div>
              
              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-slate-800 font-poppins">Ready to {isEdit ? 'Update' : 'Create'}</span>
                <span className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-poppins">
                  {formData.name || 'New Branch'}
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <div>
            {activeTab !== 'basic' && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleBack}
                className={buttonStyles.back}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" className={buttonStyles.back}>
                Cancel
              </Button>
            </DialogClose>
            
            {activeTab !== 'review' ? (
              <Button 
                onClick={handleNext}
                disabled={!isBasicValid}
                className={buttonStyles.primary}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={onSubmit} 
                disabled={isLoading}
                className={buttonStyles.primary}
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                {isEdit ? 'Update Branch' : 'Create Branch'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ===== SUCCESS ANIMATION COMPONENT =====
const BranchSuccessAnimation = ({
  isVisible,
  title,
  message,
  actionType,
  onConfirm
}: {
  isVisible: boolean;
  title: string;
  message: string;
  actionType?: 'add' | 'edit' | 'delete' | 'export';
  onConfirm: () => void;
}) => {
  if (!isVisible) return null;

  const getActionConfig = () => {
    switch (actionType) {
      case 'add':
        return { 
          gradient: 'from-green-500 to-emerald-600',
          icon: PlusCircle 
        };
      case 'edit':
        return { 
          gradient: 'from-blue-500 to-cyan-600',
          icon: Save 
        };
      case 'delete':
        return { 
          gradient: 'from-red-500 to-orange-600',
          icon: Archive 
        };
      case 'export':
        return { 
          gradient: 'from-purple-500 to-indigo-600',
          icon: Download 
        };
      default:
        return { 
          gradient: 'from-purple-500 to-indigo-600',
          icon: CheckCircle 
        };
    }
  };

  const { gradient, icon: ActionIcon } = getActionConfig();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center animate-in zoom-in duration-300">
        <div className={`w-20 h-20 bg-gradient-to-r ${gradient} rounded-full flex items-center justify-center mx-auto mb-6 animate-in zoom-in duration-500`}>
          <ActionIcon className="h-12 w-12 text-white animate-in scale-in duration-700 delay-300" />
        </div>

        <h3 className="text-2xl font-bold text-slate-800 mb-2 font-poppins">
          {title}
        </h3>

        <p className="text-slate-600 mb-6 font-poppins">
          {message}
        </p>

        <div className="flex gap-3 justify-center">
          <Button
            className={`bg-gradient-to-r ${gradient} hover:scale-105 text-white px-6 py-3 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins`}
            onClick={onConfirm}
          >
            <CheckCircle className="h-5 w-5 mr-2" />
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

// ===== MAIN BRANCHES PAGE =====
export default function EnhancedBranchesPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [branches, setBranches] = useState<Branch[]>([]);
    const [managers, setManagers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
    const [quickViewBranch, setQuickViewBranch] = useState<Branch | null>(null);

    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

    // Stats state
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        withManager: 0,
        withoutManager: 0,
        activePercentage: 0,
    });

    // Animation states
    const [animatedStats, setAnimatedStats] = useState(stats);
    const [animateIn, setAnimateIn] = useState(false);

    // Success Animation state
    const [successAnimation, setSuccessAnimation] = useState<{
      isVisible: boolean;
      title: string;
      message: string;
      actionType: 'add' | 'edit' | 'delete';
    }>({
      isVisible: false,
      title: '',
      message: '',
      actionType: 'add'
    });

    // Form state (adapted from services form structure)
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        managerId: '',
        isActive: true,
        customers: [] as any[],
        vehicleTypes: [] as any[],
        inventoryItems: [] as any[]
    });

    // Filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [managerFilter, setManagerFilter] = useState('all');

    useEffect(() => {
        setMounted(true);
        const timer = setTimeout(() => {
            setAnimateIn(true);
            setIsInitialLoad(false);
        }, 100);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // Animate stats changes
        if (stats.total > 0) {
            const timer = setTimeout(() => {
                setAnimatedStats(stats);
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [stats]);

    const fetchBranches = useCallback(async () => {
        if (!supabase) return;
        setIsLoading(true);
        const { data, error } = await supabase
            .from('branch')
            .select(`
                *,
                user:manager_id(user_id, name)
            `)
            .order('name', { ascending: true });
    
        if (error) {
            setFetchError(`Could not fetch branches: ${error.message}`);
            setBranches([]);
        } else {
            setBranches(data as any);
            setFetchError(null);
        }
        setIsLoading(false);
        setLastUpdated(new Date());
    }, []);

    const fetchManagers = useCallback(async () => {
        if (!supabase) return;
        const { data, error } = await supabase
            .from('user')
            .select('user_id, name, role')
            .in('role', [1, 2])
            .order('name', { ascending: true });
    
        if (error) {
            console.error('Error fetching managers:', error);
            setManagers([]);
        } else {
            setManagers(data as User[]);
            // Also set in form data for the select
            setFormData(prev => ({
                ...prev,
                customers: data.map(m => ({ user_id: m.user_id, name: m.name, role: m.role }))
            }));
        }
    }, []);

    useEffect(() => {
        fetchBranches();
        fetchManagers();
    }, [fetchBranches, fetchManagers]);

    useEffect(() => {
        if (branches.length > 0) {
            const active = branches.filter(b => b.is_active).length;
            const inactive = branches.filter(b => !b.is_active).length;
            const withManager = branches.filter(b => b.manager_id).length;
            
            setStats({
                total: branches.length,
                active,
                inactive,
                withManager,
                withoutManager: branches.length - withManager,
                activePercentage: Math.round((active / branches.length) * 100)
            });
        }
    }, [branches]);

    // Filter branches based on search and filters
    const filteredBranches = branches.filter(branch => {
        const matchesSearch = branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            branch.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            branch.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            branch.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' || 
                            (statusFilter === 'active' && branch.is_active) ||
                            (statusFilter === 'inactive' && !branch.is_active);

        const matchesManager = managerFilter === 'all' || 
                             branch.manager_id === managerFilter;

        return matchesSearch && matchesStatus && matchesManager;
    });

    const resetForm = () => {
        setFormData({
            name: '',
            address: '',
            phone: '',
            email: '',
            managerId: '',
            isActive: true,
            customers: formData.customers,
            vehicleTypes: formData.vehicleTypes,
            inventoryItems: formData.inventoryItems
        });
        setEditingBranch(null);
    };

    const handleOpenAddDialog = () => {
        resetForm();
        setIsAddDialogOpen(true);
    };

    const handleOpenEditDialog = (branch: Branch) => {
        setEditingBranch(branch);
        setFormData({
            name: branch.name,
            address: branch.address || '',
            phone: branch.phone || '',
            email: branch.email || '',
            managerId: branch.manager_id || '',
            isActive: branch.is_active,
            customers: formData.customers,
            vehicleTypes: formData.vehicleTypes,
            inventoryItems: formData.inventoryItems
        });
        setIsEditDialogOpen(true);
    };

    const handleOpenDeleteDialog = (branch: Branch) => {
        setDeletingBranch(branch);
        setIsDeleteConfirmationOpen(true);
    };

    const handleRefresh = () => {
        fetchBranches();
        fetchManagers();
    };

    const handleSubmit = async () => {
        if (!supabase || !authUser) return;
        if (!formData.name) {
            toast({ 
                title: "Validation Error", 
                description: "Branch name is required.", 
                variant: "destructive",
                icon: <XCircle className="h-5 w-5" />
            });
            return;
        }

        setIsLoading(true);

        const branchData = {
            name: formData.name,
            address: formData.address || null,
            phone: formData.phone || null,
            email: formData.email || null,
            manager_id: formData.managerId && formData.managerId !== 'none' ? formData.managerId : null,
            is_active: formData.isActive,
        };

        let error;
        if (editingBranch) {
            const { error: updateError } = await supabase
                .from('branch')
                .update(branchData)
                .eq('branch_id', editingBranch.branch_id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('branch')
                .insert([branchData]);
            error = insertError;
        }

        setIsLoading(false);

        if (error) {
            toast({ 
                title: "Save Error", 
                description: `Could not save branch: ${error.message}`, 
                variant: "destructive",
                icon: <XCircle className="h-5 w-5" />
            });
        } else {
            // Show success animation
            setSuccessAnimation({
              isVisible: true,
              title: editingBranch ? "Branch Updated!" : "Branch Created!",
              message: `Branch has been ${editingBranch ? 'updated' : 'created'} successfully.`,
              actionType: editingBranch ? 'edit' : 'add'
            });
            
            setIsAddDialogOpen(false);
            setIsEditDialogOpen(false);
            fetchBranches();
        }
    };

    const handleDeleteBranch = async () => {
        if (!deletingBranch || !supabase) return;
        setIsLoading(true);
        const { error } = await supabase
            .from('branch')
            .delete()
            .eq('branch_id', deletingBranch.branch_id);
        setIsLoading(false);

        if (error) {
            toast({ 
                title: "Delete Error", 
                description: `Could not delete branch: ${error.message}`, 
                variant: "destructive",
                icon: <XCircle className="h-5 w-5" />
            });
        } else {
            // Show success animation for deletion
            setSuccessAnimation({
              isVisible: true,
              title: "Branch Deleted!",
              message: "The branch has been removed from the system.",
              actionType: 'delete'
            });
            
            setIsDeleteConfirmationOpen(false);
            fetchBranches();
        }
    };

    const clearFilters = () => {
        setSearchTerm('');
        setStatusFilter('all');
        setManagerFilter('all');
    };

    // Stats card configuration
    const statsConfig = [
        {
            title: "Total Branches",
            value: animatedStats.total,
            statKey: 'total' as const,
            icon: Building2,
            delay: 0
        },
        {
            title: "Active",
            value: animatedStats.active,
            percentage: animatedStats.activePercentage,
            statKey: 'active' as const,
            icon: CheckCircle,
            delay: 100
        },
        {
            title: "Inactive",
            value: animatedStats.inactive,
            statKey: 'inactive' as const,
            icon: XCircle,
            delay: 200
        },
        {
            title: "With Manager",
            value: animatedStats.withManager,
            statKey: 'withManager' as const,
            icon: UserCheck,
            delay: 300
        },
        {
            title: "Without Manager",
            value: animatedStats.withoutManager,
            statKey: 'withoutManager' as const,
            icon: UserX,
            delay: 400
        }
    ];

    return (
        <div className="min-h-screen bg-white text-slate-800 font-poppins relative overflow-hidden">
            
            {/* Background Sections */}
            <div className="absolute top-0 left-0 w-full h-64 rounded-b-[40px] overflow-hidden">
                <div 
                    className="absolute inset-0 rounded-b-[40px] bg-cover bg-center"
                    style={{ 
                        backgroundImage: "url('/images/image2.jpg')",
                        backgroundSize: "cover",
                        backgroundPosition: "center 30%"
                    }}
                ></div>
                <div className="absolute top-0 left-0 w-32 h-32 bg-purple-300/20 rounded-br-full"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-300/20 rounded-bl-full"></div>
            </div>

            <div className="absolute top-64 left-0 w-full h-full bg-indigo-50/10">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-100/15 to-indigo-50/10"></div>
            </div>

            <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">
                
                {/* Header Section */}
                <div className={`mb-8 pt-7 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-8 flex items-center justify-between shadow-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10 rounded-2xl"></div>
                        
                        <div className="relative z-10 flex-1">
                            <div className="flex items-center gap-4 mb-3">
                                <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl">
                                    <Building2 className="h-8 w-8 text-white" />
                                </div>
                                <h1 className="text-4xl font-bold text-white drop-shadow-2xl font-poppins tracking-tight">
                                    Branch Management
                                </h1>
                            </div>
                            <div className="flex items-center gap-6 text-white/90">
                                <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium font-poppins">
                                    <Target className="h-6 w-6 opacity-90" />
                                    Manage your business branches and locations
                                </p>
                                <div className="flex items-center gap-4 text-lg">
                                    {lastUpdated && (
                                        <div className="flex items-center gap-2 text-white/90 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm font-poppins">
                                            <Clock className="w-5 h-5" />
                                            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-green-300 bg-green-900/40 px-4 py-2 rounded-full backdrop-blur-sm font-poppins">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        Live data
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <Button 
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className={buttonStyles.glass + " active:scale-95 font-poppins group"}
                        >
                            <RefreshCw className={`h-6 w-6 mr-3 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                            Refresh Data
                        </Button>
                    </div>
                </div>

                {/* Success Animation */}
                <BranchSuccessAnimation
                  isVisible={successAnimation.isVisible}
                  title={successAnimation.title}
                  message={successAnimation.message}
                  actionType={successAnimation.actionType}
                  onConfirm={() => setSuccessAnimation(prev => ({ ...prev, isVisible: false }))}
                />

                {/* Interactive Statistics Dashboard */}
                <div 
                    className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 transition-all duration-700 ${
                        animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'
                    }`}
                    style={{ transitionDelay: '200ms' }}
                >
                    {statsConfig.map((stat, index) => {
                        const colors = statColors[stat.statKey];
                        return (
                            <div 
                                key={stat.title}
                                className={`transition-all duration-500 ${animateIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`}
                                style={{ transitionDelay: `${stat.delay}ms` }}
                            >
                                <Card className={`bg-gradient-to-r ${colors.bgFrom} ${colors.bgTo} border-slate-200/50 backdrop-blur-sm ${microAnimations.cardHover}`}>
                                    <CardContent className="p-6">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-slate-600 font-poppins">{stat.title}</p>
                                                <p className="text-3xl font-bold text-slate-900 mt-2 font-poppins">
                                                    <span className="counter-animation">{stat.value}</span>
                                                    {stat.percentage !== undefined && (
                                                        <span className="text-sm font-normal text-green-600 ml-2 font-poppins">
                                                            ({stat.percentage}%)
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                            <div className={`p-3 bg-gradient-to-r ${colors.from} ${colors.to} rounded-xl`}>
                                                <stat.icon className="h-6 w-6 text-white" />
                                            </div>
                                        </div>
                                        {stat.statKey === 'active' && (
                                            <div className="mt-4 h-2 bg-green-100 rounded-full overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full progress-bar"
                                                    style={{ width: `${stat.percentage || 0}%` }}
                                                />
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        );
                    })}
                </div>

                {/* Modal-style Table Card */}
                <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                    <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-purple-50/50 border-b border-slate-200/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-2xl font-bold text-slate-900 font-poppins">Branch Locations</CardTitle>
                                <CardDescription className="text-slate-600 font-poppins">
                                    <span className="counter-animation">{filteredBranches.length}</span> of {branches.length} branch{filteredBranches.length !== 1 ? 'es' : ''} shown
                                </CardDescription>
                            </div>
                            <Button 
                                onClick={handleOpenAddDialog}
                                className={buttonStyles.primary + " group"}
                            >
                                <PlusCircle className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                                New Branch
                            </Button>
                        </div>

                        {/* Enhanced Filter Bar with Glassmorphism */}
                        <div className="flex flex-col sm:flex-row gap-4 mt-6 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-white/50 shadow-sm">
                            <div className="flex-1">
                                <Label htmlFor="search" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Search Branches</Label>
                                <SearchInput 
                                    id="search"
                                    value={searchTerm}
                                    onChange={setSearchTerm}
                                    placeholder="Search by name, address, phone, or email..."
                                />
                            </div>
                            
                            <div className="sm:w-48">
                                <Label htmlFor="status-filter" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">
                                    Status {statusFilter !== 'all' && (
                                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 font-poppins">
                                            {statusFilter === 'active' ? stats.active : stats.inactive}
                                        </Badge>
                                    )}
                                </Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                        <SelectValue placeholder="All statuses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="font-poppins">All Statuses</SelectItem>
                                        <SelectItem value="active" className="font-poppins">Active ({stats.active})</SelectItem>
                                        <SelectItem value="inactive" className="font-poppins">Inactive ({stats.inactive})</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="sm:w-48">
                                <Label htmlFor="manager-filter" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">
                                    Manager {managerFilter !== 'all' && (
                                        <Badge variant="secondary" className="ml-2 h-5 px-1.5 font-poppins">
                                            1
                                        </Badge>
                                    )}
                                </Label>
                                <Select value={managerFilter} onValueChange={setManagerFilter}>
                                    <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                        <SelectValue placeholder="All managers" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all" className="font-poppins">All Managers</SelectItem>
                                        {managers.map(manager => (
                                            <SelectItem key={manager.user_id} value={manager.user_id} className="font-poppins">
                                                {manager.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {(searchTerm || statusFilter !== 'all' || managerFilter !== 'all') && (
                                <div className="flex items-end">
                                    <Button 
                                        onClick={clearFilters}
                                        variant="outline" 
                                        className="h-10 border-slate-300 text-slate-600 hover:text-slate-700 transition-all duration-300 font-poppins"
                                    >
                                        <X className="h-4 w-4 mr-2" />
                                        Clear
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-0">
                        {fetchError && (
                            <Alert variant="destructive" className="m-6 font-poppins">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>{fetchError}</AlertDescription>
                            </Alert>
                        )}

                        {(isLoading && branches.length === 0) ? (
                            // Skeleton Loading State
                            <div className="space-y-4 p-6">
                                {Array.from({ length: 5 }).map((_, index) => (
                                    <div key={index} className="animate-pulse">
                                        <div className="grid grid-cols-12 gap-4 px-6 py-6">
                                            <div className="col-span-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="rounded-lg bg-slate-200 h-10 w-10"></div>
                                                    <div className="space-y-2">
                                                        <div className="h-4 w-40 bg-slate-200 rounded"></div>
                                                        <div className="h-3 w-32 bg-slate-200 rounded"></div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="col-span-3 space-y-2">
                                                <div className="h-4 w-32 bg-slate-200 rounded"></div>
                                                <div className="h-3 w-24 bg-slate-200 rounded"></div>
                                            </div>
                                            <div className="col-span-3 space-y-2">
                                                <div className="h-4 w-32 bg-slate-200 rounded"></div>
                                                <div className="h-3 w-20 bg-slate-200 rounded"></div>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="h-8 w-16 bg-slate-200 rounded"></div>
                                            </div>
                                        </div>
                                        <div className="h-[1px] bg-slate-200/50"></div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-t-xl font-poppins">
                                    <div className="col-span-4">Branch Information</div>
                                    <div className="col-span-3">Contact Details</div>
                                    <div className="col-span-3">Management</div>
                                    <div className="col-span-2 text-center">Actions</div>
                                </div>

                                {/* Table Body with Staggered Animation */}
                                <div className="divide-y divide-slate-200/50">
                                    {filteredBranches.length === 0 ? (
                                        // Enhanced Empty State
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-500 font-poppins">
                                            <div className="relative mb-6">
                                                <Building2 className="h-24 w-24 text-slate-300 animate-float" />
                                                <div className="absolute -inset-4 bg-gradient-to-r from-purple-100/30 to-indigo-100/30 rounded-full blur-xl"></div>
                                            </div>
                                            <p className="text-2xl font-medium mb-2">No branches found</p>
                                            <p className="text-sm mt-1 mb-6 text-center max-w-md">
                                                {branches.length === 0 
                                                    ? 'Create your first branch to get started.' 
                                                    : 'Try adjusting your filters to find what you\'re looking for.'}
                                            </p>
                                            {branches.length === 0 && (
                                                <Button 
                                                    onClick={handleOpenAddDialog}
                                                    className={buttonStyles.primary}
                                                >
                                                    <PlusCircle className="h-5 w-5 mr-2" />
                                                    Create Your First Branch
                                                </Button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="relative overflow-hidden">
                                            {filteredBranches.map((branch, index) => {
                                                const managerName = branch.manager?.name || branch.user?.name;
                                                return (
                                                    <div
                                                        key={branch.branch_id}
                                                        className={`grid grid-cols-12 gap-4 px-6 py-6 hover:bg-gradient-to-r hover:from-white hover:to-slate-50/50 transition-all duration-300 group relative overflow-hidden cursor-pointer slide-in ${
                                                            branch.is_active 
                                                                ? "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-green-400 before:to-emerald-500" 
                                                                : "before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-to-b before:from-red-400 before:to-rose-500"
                                                        }`}
                                                        style={{ animationDelay: `${index * 50}ms` }}
                                                        onClick={() => setQuickViewBranch(branch)}
                                                    >
                                                        {/* Branch Information */}
                                                        <div className="col-span-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg group-hover:scale-110 transition-transform duration-300 group-hover:animate-pulse">
                                                                    <Building2 className="h-5 w-5 text-white" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-semibold text-slate-900 text-lg font-poppins">{branch.name}</p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <MapPin className="h-4 w-4 text-slate-400" />
                                                                        <span className="text-sm text-slate-600 font-poppins">
                                                                            {branch.address || 'No address provided'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Contact Details */}
                                                        <div className="col-span-3 space-y-2">
                                                            {branch.phone && (
                                                                <div className="flex items-center gap-2 group/contact">
                                                                    <Phone className="h-4 w-4 text-slate-400 group-hover/contact:text-indigo-500 transition-colors" />
                                                                    <span className="text-sm text-slate-700 font-poppins">{branch.phone}</span>
                                                                </div>
                                                            )}
                                                            {branch.email && (
                                                                <div className="flex items-center gap-2 group/contact">
                                                                    <Mail className="h-4 w-4 text-slate-400 group-hover/contact:text-indigo-500 transition-colors" />
                                                                    <span className="text-sm text-slate-700 font-poppins">{branch.email}</span>
                                                                </div>
                                                            )}
                                                            {!branch.phone && !branch.email && (
                                                                <span className="text-sm text-slate-400 font-poppins">No contact details</span>
                                                            )}
                                                        </div>

                                                        {/* Management */}
                                                        <div className="col-span-3 space-y-2">
                                                            {managerName && (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <Users className="h-4 w-4 text-slate-400" />
                                                                    </div>
                                                                    <span className="text-sm text-slate-700 font-poppins">
                                                                        {managerName}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <Badge 
                                                                variant={branch.is_active ? 'default' : 'secondary'} 
                                                                className={`transition-colors duration-200 flex items-center gap-1.5 px-3 py-1 font-poppins ${
                                                                    branch.is_active 
                                                                        ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200 hover:from-green-100 hover:to-emerald-100" 
                                                                        : "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200 hover:from-red-100 hover:to-rose-100"
                                                                }`}
                                                            >
                                                                {branch.is_active ? (
                                                                    <>
                                                                        <span className="relative flex h-2 w-2">
                                                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                                        </span>
                                                                        Active
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <span className="relative flex h-2 w-2">
                                                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                                                        </span>
                                                                        Inactive
                                                                    </>
                                                                )}
                                                            </Badge>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="col-span-2 flex items-center justify-center gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenEditDialog(branch);
                                                                }}
                                                                className="h-8 px-3 border-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition-all duration-300 ripple font-poppins"
                                                            >
                                                                <Edit className="h-3 w-3" />
                                                            </Button>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleOpenDeleteDialog(branch);
                                                                }}
                                                                className="h-8 px-3 border-slate-300 hover:border-red-400 hover:text-red-600 transition-all duration-300 ripple font-poppins"
                                                            >
                                                                <Trash2 className="h-3 w-3" />
                                                            </Button>
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setQuickViewBranch(branch);
                                                                }}
                                                                className="h-8 px-3 border-slate-300 hover:border-blue-400 hover:text-blue-600 transition-all duration-300 ripple font-poppins"
                                                            >
                                                                <Eye className="h-3 w-3" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Enhanced Branch Form (Adapted from Service Form) */}
                <BranchForm
                    isOpen={isAddDialogOpen || isEditDialogOpen}
                    onClose={() => {
                        setIsAddDialogOpen(false);
                        setIsEditDialogOpen(false);
                        resetForm();
                    }}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                    formData={formData}
                    onFormDataChange={setFormData}
                    isEdit={!!editingBranch}
                />

                {/* Quick View Panel */}
                <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 border-l border-slate-200 transition-transform duration-300 ${
                    quickViewBranch ? 'translate-x-0' : 'translate-x-full'
                }`}>
                    {quickViewBranch && (
                        <div className="p-6 h-full overflow-y-auto">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-900 font-poppins">Branch Details</h3>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setQuickViewBranch(null)}
                                    className="h-8 w-8 p-0"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl">
                                    <div className="p-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg">
                                        <Building2 className="h-6 w-6 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-lg text-slate-900 font-poppins">{quickViewBranch.name}</h4>
                                        <Badge className={`mt-2 font-poppins ${
                                            quickViewBranch.is_active
                                                ? "bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border-green-200"
                                                : "bg-gradient-to-r from-red-50 to-rose-50 text-red-700 border-red-200"
                                        }`}>
                                            {quickViewBranch.is_active ? 'Active' : 'Inactive'}
                                        </Badge>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <Label className="text-sm font-medium text-slate-500 font-poppins">Address</Label>
                                        <p className="mt-1 text-slate-700 flex items-start gap-2 font-poppins">
                                            <MapPin className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                            {quickViewBranch.address || 'No address provided'}
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label className="text-sm font-medium text-slate-500 font-poppins">Phone</Label>
                                            <p className="mt-1 text-slate-700 flex items-center gap-2 font-poppins">
                                                <Phone className="h-4 w-4 text-slate-400" />
                                                {quickViewBranch.phone || 'Not provided'}
                                            </p>
                                        </div>
                                        <div>
                                            <Label className="text-sm font-medium text-slate-500 font-poppins">Email</Label>
                                            <p className="mt-1 text-slate-700 flex items-center gap-2 font-poppins">
                                                <Mail className="h-4 w-4 text-slate-400" />
                                                {quickViewBranch.email || 'Not provided'}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium text-slate-500 font-poppins">Manager</Label>
                                        <p className="mt-1 text-slate-700 flex items-center gap-2 font-poppins">
                                            <Users className="h-4 w-4 text-slate-400" />
                                            {quickViewBranch.manager?.name || quickViewBranch.user?.name || 'No manager assigned'}
                                        </p>
                                    </div>

                                    <div>
                                        <Label className="text-sm font-medium text-slate-500 font-poppins">Status</Label>
                                        <div className="mt-2 flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${
                                                quickViewBranch.is_active 
                                                    ? "bg-green-500 animate-pulse" 
                                                    : "bg-red-500"
                                            }`}></div>
                                            <span className={`font-medium font-poppins ${
                                                quickViewBranch.is_active ? "text-green-700" : "text-red-700"
                                            }`}>
                                                {quickViewBranch.is_active ? 'Active and operational' : 'Inactive'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-200">
                                    <div className="flex gap-2">
                                        <Button
                                            onClick={() => {
                                                handleOpenEditDialog(quickViewBranch);
                                                setQuickViewBranch(null);
                                            }}
                                            className="flex-1"
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit Branch
                                        </Button>
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                handleOpenDeleteDialog(quickViewBranch);
                                                setQuickViewBranch(null);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Enhanced Delete Confirmation Dialog (Adapted from services.tsx) */}
                <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
                    <AlertDialogContent className="bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 backdrop-blur-sm font-poppins">
                        <AlertDialogHeader>
                            <div className="p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-lg mb-4">
                                <AlertTriangle className="h-8 w-8 text-red-500 mx-auto" />
                            </div>
                            <AlertDialogTitle className="text-slate-900 text-center font-poppins">Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-600 text-center font-poppins">
                                Are you sure you want to delete the branch "{deletingBranch?.name}"? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className={buttonStyles.back}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={handleDeleteBranch} 
                                disabled={isLoading} 
                                className="bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-red-600 active:scale-95 ripple font-poppins"
                            >
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap');
                
                .font-poppins {
                    font-family: 'Poppins', sans-serif;
                }

                .ripple {
                    position: relative;
                    overflow: hidden;
                }

                .ripple:after {
                    content: "";
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    width: 5px;
                    height: 5px;
                    background: rgba(255, 255, 255, 0.5);
                    opacity: 0;
                    border-radius: 100%;
                    transform: scale(1, 1) translate(-50%);
                    transform-origin: 50% 50%;
                }

                .ripple:focus:not(:active)::after {
                    animation: ripple 1s ease-out;
                }

                @keyframes ripple {
                    0% {
                        transform: scale(0, 0);
                        opacity: 0.5;
                    }
                    20% {
                        transform: scale(25, 25);
                        opacity: 0.3;
                    }
                    100% {
                        opacity: 0;
                        transform: scale(40, 40);
                    }
                }

                @keyframes float {
                    0%, 100% {
                        transform: translateY(0px);
                    }
                    50% {
                        transform: translateY(-10px);
                    }
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                @keyframes counter {
                    from {
                        opacity: 0;
                        transform: scale(0.5);
                    }
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }

                @keyframes progress {
                    from {
                        width: 0%;
                    }
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                @keyframes zoomIn {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }

                @keyframes scaleIn {
                    from { transform: scale(0); }
                    to { transform: scale(1); }
                }

                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }

                .slide-in {
                    animation: slideIn 0.3s ease-out forwards;
                    opacity: 0;
                }

                .counter-animation {
                    display: inline-block;
                    animation: counter 0.3s ease-out;
                }

                .progress-bar {
                    animation: progress 1s ease-out forwards;
                }

                .animate-in {
                    animation: fadeIn 0.3s ease-out;
                }

                .zoom-in {
                    animation: zoomIn 0.3s ease-out;
                }

                .scale-in {
                    animation: scaleIn 0.3s ease-out;
                }

                .ease-spring {
                    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                .glass-effect {
                    background: rgba(255, 255, 255, 0.7);
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}