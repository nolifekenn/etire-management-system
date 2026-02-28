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
import { useToast } from "@/hooks/use-toast";
import { validateShortText, validatePhone, validateLongText, type FieldError } from '@/lib/validation';
import {
  Loader2, PlusCircle, AlertTriangle, Building2, MapPin, Phone,
  RefreshCw, Clock, Edit, Trash2, Search, X, Eye, CheckCircle,
  ArrowLeft, Save, Archive, Download,
  Plus, Download as DownloadIcon, Eye as EyeIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Branch } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

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
    isActive: boolean;
  };
  onFormDataChange: (data: any) => void;
  isEdit?: boolean;
  formErrors?: { name?: FieldError; address?: FieldError; phone?: FieldError };
}

const BranchForm = ({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
  formData,
  onFormDataChange,
  isEdit = false,
  formErrors = {},
}: BranchFormProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl font-poppins">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isEdit ? 'Edit Branch' : 'Add New Branch'}
          </DialogTitle>
          <DialogDescription className="text-slate-600">
            {isEdit ? 'Update the branch details.' : 'Fill in the details for the new branch.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label htmlFor="branch-name" className="text-sm font-medium text-slate-700">
              Branch Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="branch-name"
              value={formData.name}
              onChange={(e) => onFormDataChange({ ...formData, name: e.target.value })}
              placeholder="e.g. Main Branch"
              maxLength={100}
              aria-invalid={!!formErrors.name}
              className={`h-9 border-slate-300 focus:border-indigo-400${formErrors.name ? ' border-red-400 focus:border-red-400' : ''}`}
            />
            {formErrors.name && <p className="text-xs text-red-500">⚠ {formErrors.name}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="branch-address" className="text-sm font-medium text-slate-700">Address</Label>
            <Textarea
              id="branch-address"
              value={formData.address}
              onChange={(e) => onFormDataChange({ ...formData, address: e.target.value })}
              placeholder="123 Main Street, City"
              maxLength={210}
              aria-invalid={!!formErrors.address}
              className={`border-slate-300 focus:border-indigo-400 resize-none${formErrors.address ? ' border-red-400 focus:border-red-400' : ''}`}
              rows={2}
            />
            {formErrors.address && <p className="text-xs text-red-500">⚠ {formErrors.address}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="branch-phone" className="text-sm font-medium text-slate-700">Phone</Label>
            <Input
              id="branch-phone"
              value={formData.phone}
              onChange={(e) => onFormDataChange({ ...formData, phone: e.target.value })}
              placeholder="+1-555-0101"
              aria-invalid={!!formErrors.phone}
              className={`h-9 border-slate-300 focus:border-indigo-400${formErrors.phone ? ' border-red-400 focus:border-red-400' : ''}`}
            />
            {formErrors.phone && <p className="text-xs text-red-500">⚠ {formErrors.phone}</p>}
          </div>

          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
            <Switch
              id="branch-active"
              checked={formData.isActive}
              onCheckedChange={(checked) => onFormDataChange({ ...formData, isActive: checked })}
              className="data-[state=checked]:bg-green-500"
            />
            <Label htmlFor="branch-active" className="text-sm font-medium text-slate-700 cursor-pointer">
              Active Branch
            </Label>
            {formData.isActive && (
              <div className="ml-auto flex items-center gap-1 text-green-600 text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                </span>
                Active
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={onSubmit}
            disabled={isLoading || !formData.name.trim()}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Update Branch' : 'Create Branch'}
          </Button>
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
    isActive: true,
  });
  const [branchErrors, setBranchErrors] = useState<{ name?: FieldError; address?: FieldError; phone?: FieldError }>({});

  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 5;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const fetchBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/branches');
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Failed to fetch branches.');
      setBranches(payload.data || []);
      setFetchError(null);
    } catch (err: any) {
      setFetchError(err.message || 'Could not fetch branches.');
      setBranches([]);
    }
    setIsLoading(false);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  // Filter branches based on search and filters
  const filteredBranches = useMemo(() => {
    return branches.filter(branch => {
      const matchesSearch = branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        branch.phone?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && branch.is_active) ||
        (statusFilter === 'inactive' && !branch.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [branches, searchTerm, statusFilter]);

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
      isActive: true,
    });
    setEditingBranch(null);
    setBranchErrors({});
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
      isActive: branch.is_active,
    });
    setIsEditDialogOpen(true);
  };

  const handleOpenDeleteDialog = (branch: Branch) => {
    setDeletingBranch(branch);
    setIsDeleteConfirmationOpen(true);
  };

  const handleRefresh = () => {
    fetchBranches();
  };

  const handleSubmit = async () => {
    if (!authUser) return;

    // Inline validation
    const errs = {
      name:    validateShortText(formData.name,    { label: 'Branch name', required: true,  minLength: 2, maxLength: 100 }),
      address: validateLongText (formData.address, { label: 'Address',     maxLength: 200 }),
      phone:   validatePhone    (formData.phone,   { label: 'Phone' }),
    };
    setBranchErrors(errs);
    if (errs.name || errs.address || errs.phone) return;

    setIsLoading(true);
    try {
      const branchData = {
        name: formData.name,
        address: formData.address || null,
        phone: formData.phone || null,
        is_active: formData.isActive,
      };

      let res: Response;
      if (editingBranch) {
        res = await fetch('/api/branches', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ branch_id: editingBranch.branch_id, ...branchData }),
        });
      } else {
        res = await fetch('/api/branches', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(branchData),
        });
      }

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Could not save branch.');

      setSuccessAnimation({
        isVisible: true,
        title: editingBranch ? "Branch Updated!" : "Branch Created!",
        message: `Branch has been ${editingBranch ? 'updated' : 'created'} successfully.`,
        actionType: editingBranch ? 'edit' : 'add'
      });
      setIsAddDialogOpen(false);
      setIsEditDialogOpen(false);
      fetchBranches();
    } catch (err: any) {
      toast({
        title: "Save Error",
        description: err.message || 'Could not save branch.',
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handleDeleteBranch = async () => {
    if (!deletingBranch) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/branches', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branch_id: deletingBranch.branch_id,
          deleted_at: new Date().toISOString(),
        }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || 'Could not delete branch.');

      setSuccessAnimation({
        isVisible: true,
        title: "Branch Deleted!",
        message: "The branch has been removed from the system.",
        actionType: 'delete'
      });
      setIsDeleteConfirmationOpen(false);
      fetchBranches();
    } catch (err: any) {
      toast({
        title: "Delete Error",
        description: err.message || 'Could not delete branch.',
        variant: "destructive"
      });
    }
    setIsLoading(false);
  };

  const handleExportExcel = () => {
    const headers = ['Branch Name', 'Address', 'Phone', 'Status'];
    const csvContent = [
      headers.join(','),
      ...branches.map(branch => {
        const status = branch.is_active ? 'Active' : 'Inactive';
        return [
          `"${branch.name}"`,
          `"${branch.address || ''}"`,
          branch.phone || '',
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
      header: 'Phone',
      render: (_value: any, branch: any) => (
        branch.phone
          ? <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-slate-400" /><span className="text-sm text-slate-700 font-poppins">{branch.phone}</span></div>
          : <span className="text-sm text-slate-400 font-poppins">No phone</span>
      )
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
          <Button onClick={handleOpenAddDialog} size="sm" className="shrink-0 bg-[#714B67] hover:bg-[#5a3c53] text-white">
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
                    className="bg-[#714B67] hover:bg-[#5a3c53] text-white"
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
              <div className="rounded-lg overflow-hidden border border-border">
                <div className="w-full bg-muted/50 border-b border-border p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="text-sm font-semibold text-foreground">Branch Locations</div>
                      <div className="text-xs text-muted-foreground">
                        {searchTerm || statusFilter !== 'all' ? (
                          <>Filtered: <strong>{filteredBranches.length}</strong> of <strong>{branches.length}</strong> branches</>
                        ) : (
                          <>Total: <strong>{branches.length}</strong> branches</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Filter Section */}
                <div className="p-4 border-b border-border bg-background">
                  {/* Removed 'mb-5' from the classList below to eliminate space below filters */}
                  <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                    <div className="flex-1 relative">
                      <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">Search</Label>
                      <div className="relative group">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-indigo-500 transition-colors" />
                        <Input
                          placeholder="Search by name, address, or phone..."
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

                      {(searchTerm || statusFilter !== 'all') && (
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
                      <tr className="bg-muted/50">
                        <th className="border border-border p-3 text-left font-medium text-muted-foreground">Branch Name</th>
                        <th className="border border-border p-3 text-left font-medium text-muted-foreground">Phone</th>
                        <th className="border border-border p-3 text-left font-medium text-muted-foreground">Status</th>
                        <th className="border border-border p-3 text-left font-medium text-muted-foreground">Actions</th>
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
          onFormDataChange={(newData) => {
            setFormData(newData);
            setBranchErrors({
              name:    validateShortText(newData.name,    { label: 'Branch name', required: true,  minLength: 2, maxLength: 100 }),
              address: validateLongText (newData.address, { label: 'Address',     maxLength: 200 }),
              phone:   validatePhone    (newData.phone,   { label: 'Phone' }),
            });
          }}
          isEdit={!!editingBranch}
          formErrors={branchErrors}
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

                  <div>
                    <Label className="text-sm font-medium text-slate-500 font-poppins">Phone</Label>
                    <p className="mt-1 text-slate-700 flex items-center gap-2 font-poppins">
                      <Phone className="h-4 w-4 text-slate-400" />
                      {quickViewBranch.phone || 'Not provided'}
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
                      <th className="border border-slate-200 p-3 text-left font-semibold text-slate-700">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((branch) => (
                        <tr key={branch.branch_id} className="hover:bg-slate-50">
                          <td className="border border-slate-200 p-3">{branch.name}</td>
                          <td className="border border-slate-200 p-3">{branch.address || 'N/A'}</td>
                          <td className="border border-slate-200 p-3">{branch.phone || 'N/A'}</td>
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
                    ))}
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