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
  ChevronDown, Save, Archive, ArrowRight, Download, TrendingUp, DollarSign,
  Plus, Download as DownloadIcon, Eye as EyeIcon
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

// ===== BRANCH FORM COMPONENT =====
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
  const { customers } = formData;

  const handleNext = () => {
    if (activeTab === 'basic') setActiveTab('review');
  };

  const handleBack = () => {
    if (activeTab === 'review') setActiveTab('basic');
  };

  const isBasicValid = formData.name && formData.name.trim() !== '';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl font-poppins fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] gap-4 z-50">
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
                <div className={`flex items-center justify-center w-8 h-8 rounded-full font-semibold text-sm ${isActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white'
                  : isCompleted
                    ? 'bg-green-500 text-white'
                    : 'bg-slate-200 text-slate-600'
                  }`}>
                  {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
                </div>
                <span className={`ml-2 text-sm font-medium ${isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-slate-500'
                  }`}>
                  {step}
                </span>
                {index < 1 && (
                  <div className={`w-12 h-1 mx-2 ${isCompleted ? 'bg-green-500' : 'bg-slate-200'
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
                  className={`border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 font-poppins ${formData.name ? "border-green-400" : ""
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
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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

// ===== PAGINATION COMPONENT =====
const PaginationControls = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  rowsPerPage
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  rowsPerPage: number;
}) => {
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = Math.min(startIndex + rowsPerPage, totalItems);

  return (
    <div className="flex items-center justify-between p-6 border-t border-slate-200 bg-white">
      {/* Left Side: Showing text */}
      <div className="text-sm text-slate-600 font-poppins">
        Showing {totalItems === 0 ? 0 : startIndex + 1} to {endIndex} of {totalItems} entries
      </div>

      {/* Right Side: Simple Pager Controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="h-8 px-2 min-w-[36px] bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
        >
          «
        </Button>
        <Button
          variant="outline"
          className="h-8 px-2 min-w-[36px] bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          ‹
        </Button>

        <span className="text-sm text-slate-600 px-2 font-medium font-poppins min-w-[80px] text-center">
          Page {currentPage} of {totalPages || 1}
        </span>

        <Button
          variant="outline"
          className="h-8 px-2 min-w-[36px] bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          ›
        </Button>
        <Button
          variant="outline"
          className="h-8 px-2 min-w-[36px] bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages || totalPages === 0}
        >
          »
        </Button>
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

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [quickViewBranch, setQuickViewBranch] = useState<Branch | null>(null);
  const [isViewMoreOpen, setIsViewMoreOpen] = useState(false);

  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);

  // Success Animation state
  const [successAnimation, setSuccessAnimation] = useState<{
    isVisible: boolean;
    title: string;
    message: string;
    actionType: 'add' | 'edit' | 'delete' | 'export';
  }>({
    isVisible: false,
    title: '',
    message: '',
    actionType: 'add'
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    managerId: '',
    isActive: true,
    customers: [] as any[],
  });

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [managerFilter, setManagerFilter] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, managerFilter]);

  const fetchBranches = useCallback(async () => {
    if (!supabase) return;
    setIsLoading(true);
    const { data, error } = await supabase
      .from('branch')
      .select(`
                *,
                user:manager_id(user_id, name)
            `)
      .is('deleted_at', null)
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
      .in('role', ['staff', 'branch_manager'])
      .is('deleted_at', null)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching managers:', error);
      setManagers([]);
    } else {
      setManagers(data as User[]);
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

  // Filter branches based on search and filters
  const filteredBranches = useMemo(() => {
    return branches.filter(branch => {
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
  }, [branches, searchTerm, statusFilter, managerFilter]);

  // Pagination Logic
  const totalItems = filteredBranches.length;
  const totalPages = Math.ceil(totalItems / rowsPerPage);

  const currentBranches = useMemo(() => {
    const firstPageIndex = (currentPage - 1) * rowsPerPage;
    const lastPageIndex = firstPageIndex + rowsPerPage;
    return filteredBranches.slice(firstPageIndex, lastPageIndex);
  }, [currentPage, filteredBranches, rowsPerPage]);


  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      phone: '',
      email: '',
      managerId: '',
      isActive: true,
      customers: formData.customers,
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
        variant: "destructive"
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
        variant: "destructive"
      });
    } else {
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
    // Soft delete: set deleted_at timestamp instead of removing the record
    const { error } = await supabase
      .from('branch')
      .update({ deleted_at: new Date().toISOString() })
      .eq('branch_id', deletingBranch.branch_id);
    setIsLoading(false);

    if (error) {
      toast({
        title: "Delete Error",
        description: `Could not delete branch: ${error.message}`,
        variant: "destructive"
      });
    } else {
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

  const handleExportExcel = () => {
    const headers = ['Branch Name', 'Address', 'Phone', 'Email', 'Manager', 'Status'];
    const csvContent = [
      headers.join(','),
      ...branches.map(branch => {
        const managerName = branch.manager?.name || branch.user?.name || 'No Manager';
        const status = branch.is_active ? 'Active' : 'Inactive';

        return [
          `"${branch.name}"`,
          `"${branch.address || ''}"`,
          branch.phone || '',
          branch.email || '',
          `"${managerName}"`,
          status
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `branches_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setSuccessAnimation({
      isVisible: true,
      title: "Export Successful!",
      message: `Exported ${branches.length} branches to CSV file.`,
      actionType: 'export'
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setManagerFilter('all');
  };

  // Columns configuration for the table - UPDATED to include view icon
  const columns = [
    {
      key: 'name',
      header: 'Branch Name',
      render: (value: any, branch: any) => (
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
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
      )
    },
    {
      key: 'contact',
      header: 'Contact Details',
      render: (value: any, branch: any) => (
        <div className="space-y-2">
          {branch.phone && (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-700 font-poppins">{branch.phone}</span>
            </div>
          )}
          {branch.email && (
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-slate-400" />
              <span className="text-sm text-slate-700 font-poppins">{branch.email}</span>
            </div>
          )}
          {!branch.phone && !branch.email && (
            <span className="text-sm text-slate-400 font-poppins">No contact details</span>
          )}
        </div>
      )
    },
    {
      key: 'manager',
      header: 'Manager',
      render: (value: any, branch: any) => {
        const managerName = branch.manager?.name || branch.user?.name;
        return managerName ? (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-slate-400" />
            <span className="text-sm text-slate-700 font-poppins">{managerName}</span>
          </div>
        ) : (
          <span className="text-sm text-slate-400 font-poppins">No manager assigned</span>
        );
      }
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: any, branch: any) => (
        <Badge
          variant={branch.is_active ? 'default' : 'secondary'}
          className={`flex items-center gap-1.5 px-3 py-1 font-poppins ${branch.is_active
            ? "bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
            : "bg-red-100 text-red-700 border-red-200 hover:bg-red-200"
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
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      // UPDATED: Added view (eye) icon button
      render: (value: any, branch: any) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setQuickViewBranch(branch)}
            className="h-8 px-3 border-slate-300 hover:border-blue-400 hover:text-blue-600 transition-all duration-300"
          >
            <Eye className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenEditDialog(branch)}
            className="h-8 px-3 border-slate-300 hover:border-indigo-400 hover:text-indigo-600 transition-all duration-300"
          >
            <Edit className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleOpenDeleteDialog(branch)}
            className="h-8 px-3 border-slate-300 hover:border-red-400 hover:text-red-600 transition-all duration-300"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 py-4">

        {/* Compact Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">
              Branch Management
            </h1>
            {lastUpdated && (
              <span className="text-sm text-muted-foreground hidden sm:inline">
                <Clock className="inline h-3.5 w-3.5 mr-1" />
                Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
              </span>
            )}
          </div>
          <Button onClick={handleRefresh} disabled={isLoading} variant="outline" size="sm">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Success Animation */}
        <BranchSuccessAnimation
          isVisible={successAnimation.isVisible}
          title={successAnimation.title}
          message={successAnimation.message}
          actionType={successAnimation.actionType}
          onConfirm={() => setSuccessAnimation(prev => ({ ...prev, isVisible: false }))}
        />

        {/* Quick Actions - Compact horizontal bar */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          <Button onClick={handleOpenAddDialog} size="sm" className="shrink-0 bg-purple-600 hover:bg-purple-700 text-white">
            <Plus className="h-4 w-4 mr-1" />Add Branch
          </Button>
          <Button onClick={handleExportExcel} size="sm" variant="outline" className="shrink-0">
            <DownloadIcon className="h-4 w-4 mr-1" />Export
          </Button>
          <Button onClick={() => setIsViewMoreOpen(true)} size="sm" variant="outline" className="shrink-0">
            <EyeIcon className="h-4 w-4 mr-1" />View More
          </Button>
        </div>

        {/* Main Table Card - MATCHING INVENTORY DESIGN */}
        <section aria-labelledby="branch-list-heading">
          {isLoading && branches.length === 0 && !fetchError ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-xl border border-slate-200 p-8">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
              <p className="text-slate-600">Loading branches...</p>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <Building2 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No branches found</h3>
              <p className="text-slate-500 mb-4">
                {branches.length === 0
                  ? 'Get started by adding your first branch to manage locations.'
                  : 'Try adjusting your search criteria or clear filters to see all branches.'}
              </p>
              <div className="flex gap-3 justify-center">
                {branches.length === 0 ? (
                  <Button
                    onClick={handleOpenAddDialog}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 hover:scale-105"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Branch
                  </Button>
                ) : (
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    className="flex items-center gap-2 transition-all duration-300 hover:scale-105"
                  >
                    <X className="h-4 w-4" />
                    Clear Filters
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Single rounded card: gradient header + table */}
              <div className="rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
                <div className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-400 text-white p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <div className="text-xl font-bold font-poppins">Branch Locations</div>
                      <div className="text-sm opacity-90">Manage your business branches and locations</div>
                      {/* Total / Filtered count */}
                      <div className="text-sm text-white/90 mt-1">
                        {searchTerm || statusFilter !== 'all' || managerFilter !== 'all' ? (
                          <>Filtered: <strong>{filteredBranches.length}</strong> of <strong>{branches.length}</strong> branches</>
                        ) : (
                          <>Total: <strong>{branches.length}</strong> branches</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter Section */}
                <div className="bg-white p-5 border-b border-slate-200">
                  {/* Removed 'mb-5' from the classList below to eliminate space below filters */}
                  <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                    <div className="flex-1 relative">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Search</Label>
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
                        <Input
                          placeholder="Search by name, address, phone, or email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 h-10 bg-slate-50 border-slate-200 focus:bg-white focus:border-indigo-500 transition-all rounded-md"
                        />
                        {searchTerm && (
                          <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 w-full lg:w-auto">
                      <div className="w-1/2 lg:w-48">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Status</Label>
                        <Select
                          value={statusFilter}
                          onValueChange={setStatusFilter}
                        >
                          <SelectTrigger className="h-10 bg-white border-slate-200 rounded-md">
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="w-1/2 lg:w-48">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Manager</Label>
                        <Select
                          value={managerFilter}
                          onValueChange={setManagerFilter}
                        >
                          <SelectTrigger className="h-10 bg-white border-slate-200 rounded-md">
                            <SelectValue placeholder="All managers" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Managers</SelectItem>
                            {managers.map(manager => (
                              <SelectItem key={manager.user_id} value={manager.user_id}>
                                {manager.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {(searchTerm || statusFilter !== 'all' || managerFilter !== 'all') && (
                        <div className="hidden lg:flex items-end">
                          <Button
                            variant="outline"
                            onClick={clearFilters}
                            className="h-10 px-3 text-slate-500 border-slate-200 hover:bg-slate-50 rounded-md"
                            title="Clear all filters"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700 font-poppins">Branch Name</th>
                        <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700 font-poppins">Contacts</th>
                        <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700 font-poppins">Manager</th>
                        <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700 font-poppins">Status</th>
                        <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700 font-poppins">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBranches.map((branch, index) => (
                        <tr
                          key={branch.branch_id}
                          className="border-t border-slate-100 hover:bg-slate-50 transition-colors"
                        >
                          <td className="p-4">
                            {columns[0].render(null, branch)}
                          </td>
                          <td className="p-4">
                            {columns[1].render(null, branch)}
                          </td>
                          <td className="p-4">
                            {columns[2].render(null, branch)}
                          </td>
                          <td className="p-4">
                            {columns[3].render(null, branch)}
                          </td>
                          <td className="p-4">
                            {columns[4].render(null, branch)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                <PaginationControls
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  totalItems={totalItems}
                  rowsPerPage={rowsPerPage}
                />
              </div>
            </>
          )}
        </section>

        {/* Branch Form (Edit/Add) - ADDED BACK */}
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

        {/* Quick View Panel - ADDED BACK */}
        <div className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl z-50 border-l border-slate-200 transition-transform duration-300 ${quickViewBranch ? 'translate-x-0' : 'translate-x-full'
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
                    <Badge className={`mt-2 font-poppins ${quickViewBranch.is_active
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
                      <div className={`w-3 h-3 rounded-full ${quickViewBranch.is_active
                        ? "bg-green-500 animate-pulse"
                        : "bg-red-500"
                        }`}></div>
                      <span className={`font-medium font-poppins ${quickViewBranch.is_active ? "text-green-700" : "text-red-700"
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

        {/* View More Dialog */}
        <Dialog open={isViewMoreOpen} onOpenChange={setIsViewMoreOpen}>
          <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Complete Branches List
              </DialogTitle>
              <DialogDescription className="text-slate-600">
                Detailed view of all branches with comprehensive information
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-200">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Branch Name</th>
                      <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Address</th>
                      <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Phone</th>
                      <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Email</th>
                      <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Manager</th>
                      <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => {
                      const managerName = branch.manager?.name || branch.user?.name;
                      return (
                        <tr key={branch.branch_id} className="hover:bg-slate-50">
                          <td className="border border-slate-200 p-3">{branch.name}</td>
                          <td className="border border-slate-200 p-3">{branch.address || 'N/A'}</td>
                          <td className="border border-slate-200 p-3">{branch.phone || 'N/A'}</td>
                          <td className="border border-slate-200 p-3">{branch.email || 'N/A'}</td>
                          <td className="border border-slate-200 p-3">{managerName || 'No Manager'}</td>
                          <td className="border border-slate-200 p-3">
                            <Badge
                              variant={branch.is_active ? "default" : "outline"}
                              className={
                                branch.is_active
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : 'bg-red-100 text-red-700 border-red-200'
                              }
                            >
                              {branch.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setIsViewMoreOpen(false)} variant="outline" className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enhanced Delete Confirmation Dialog */}
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

                .ease-spring {
                    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
                
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
            `}</style>
    </div>
  );
}