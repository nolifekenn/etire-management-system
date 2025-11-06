"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Loader2, PlusCircle, AlertTriangle, Package, Truck, ShoppingCart, Users, Building2, 
  RefreshCw, Search, X, Download, Eye, ArrowUpDown, Filter, Clock, TrendingUp,
  Calendar, Phone, Mail, MapPin, FileText, CheckCircle, Clock4, TruckIcon, ArrowLeft
} from 'lucide-react';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Supplier, PurchaseOrder, Branch, InventoryItem, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// ===== DESIGN SYSTEM =====
const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl font-poppins",
  secondary: "flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95 font-poppins",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg font-poppins",
  back: "flex items-center gap-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-slate-300 hover:border-slate-400 font-poppins"
};

const microAnimations = {
  cardHover: "transition-all duration-350 ease-spring hover:translate-y-[-6px] hover:shadow-2xl",
  buttonHover: "transition-all duration-200 hover:scale-105 active:scale-95",
  fadeIn: "animate-in fade-in duration-500",
  iconHover: "transition-all duration-350 ease-spring group-hover:scale-105 group-hover:translate-y-[-2px]",
};

// Supplier Management
const supplierColumns = [
  { key: 'name', header: 'Supplier Name' },
  { key: 'contact_person', header: 'Contact Person' },
  { key: 'phone', header: 'Phone' },
  { key: 'email', header: 'Email' },
  { key: 'payment_terms', header: 'Payment Terms'},
  { key: 'is_active', header: 'Status' },
];

// Purchase Order Management
const poColumns = [
  { key: 'po_number', header: 'PO Number' },
  { key: 'supplier_name', header: 'Supplier' },
  { key: 'branch_name', header: 'Branch' },
  { key: 'order_date', header: 'Order Date' },
  { key: 'total_amount', header: 'Total Amount' },
  { key: 'status', header: 'Status' },
];

// Custom Date Input Component with better styling
const CustomDateInput = ({ value, onChange, id, className = "" }: { value: string; onChange: (value: string) => void; id: string; className?: string }) => {
  return (
    <div className="relative">
      <Input
        id={id}
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${className} border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins custom-date-input`}
      />
    </div>
  );
};

// Optimized Search Input Component
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
  const timeoutRef = useRef<NodeJS.Timeout>();

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

// Modern Widget Components
const StatsOverview = ({ suppliers, purchaseOrders }: { suppliers: any[], purchaseOrders: any[] }) => {
    const activeSuppliers = suppliers.filter(s => s.is_active).length;
    const pendingPOs = purchaseOrders.filter(po => po.status === 'pending').length;
    const deliveredThisMonth = purchaseOrders.filter(po => 
      po.status === 'delivered' && 
      new Date(po.order_date).getMonth() === new Date().getMonth()
    ).length;
    const totalPOValue = purchaseOrders.reduce((acc, po) => acc + (po.total_amount || 0), 0);
  
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className={`bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium font-poppins">Active Suppliers</p>
              <p className="text-3xl font-bold mt-2 font-poppins">{activeSuppliers}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-purple-100 text-sm font-poppins">
            <TrendingUp className="h-4 w-4" />
            <span>All active partners</span>
          </div>
        </div>
  
        <div className={`bg-gradient-to-br from-blue-500 via-blue-600 to-sky-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium font-poppins">Pending POs</p>
              <p className="text-3xl font-bold mt-2 font-poppins">{pendingPOs}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Clock4 className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-blue-100 text-sm font-poppins">
            <AlertTriangle className="h-4 w-4" />
            <span>Awaiting approval</span>
          </div>
        </div>
  
        <div className={`bg-gradient-to-br from-teal-400 via-cyan-500 to-green-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm font-medium font-poppins">Delivered This Month</p>
              <p className="text-3xl font-bold mt-2 font-poppins">{deliveredThisMonth}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <TruckIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-teal-100 text-sm font-poppins">
            <CheckCircle className="h-4 w-4" />
            <span>Successful deliveries</span>
          </div>
        </div>
  
        <div className={`bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium font-poppins">Total PO Value</p>
              <p className="text-3xl font-bold mt-2 font-poppins">₱{(totalPOValue / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <ShoppingCart className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-purple-100 text-sm font-poppins">
            <TrendingUp className="h-4 w-4" />
            <span>This year</span>
          </div>
        </div>
      </div>
    );
};

const QuickActions = ({ onAddSupplier, onAddPO, onExportData }: { onAddSupplier: () => void, onAddPO: () => void, onExportData: () => void }) => {
  const actions = [
    {
      label: "New Supplier",
      description: "Add a new supplier",
      icon: Building2,
      onClick: onAddSupplier,
      color: "from-purple-500 to-indigo-600"
    },
    {
      label: "Create PO",
      description: "Create purchase order",
      icon: FileText,
      onClick: onAddPO,
      color: "from-blue-500 to-sky-600"
    },
    {
      label: "Export Data",
      description: "Export to Excel",
      icon: Download,
      onClick: onExportData,
      color: "from-green-500 to-emerald-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {actions.map((action, index) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={`bg-gradient-to-r ${action.color} rounded-xl p-4 text-white text-left shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group font-poppins`}
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-lg">{action.label}</p>
              <p className="text-white/80 text-sm mt-1">{action.description}</p>
            </div>
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm group-hover:scale-110 transition-transform duration-300">
              <action.icon className="h-5 w-5" />
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

const EnhancedTabs = ({ value, onValueChange, children }: any) => {
  return (
    <Tabs value={value} onValueChange={onValueChange} className="w-full font-poppins">
      <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 rounded-2xl">
        <TabsTrigger 
          value="suppliers" 
          className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-700 transition-all duration-300 font-poppins"
        >
          <Building2 className="h-4 w-4 mr-2" />
          Suppliers
        </TabsTrigger>
        <TabsTrigger 
          value="purchase-orders" 
          className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-700 transition-all duration-300 font-poppins"
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          Purchase Orders
        </TabsTrigger>
      </TabsList>
      {children}
    </Tabs>
  );
};

export default function EnhancedPurchasingPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [activeTab, setActiveTab] = useState('suppliers');
    const [mounted, setMounted] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    
    // Suppliers state
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [isSupplierLoading, setIsSupplierLoading] = useState(true);
    const [supplierError, setSupplierError] = useState<string | null>(null);
    
    // Purchase Orders state
    const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
    const [isPOLoading, setIsPOLoading] = useState(true);
    const [poError, setPOError] = useState<string | null>(null);
    
    // Supporting data
    const [branches, setBranches] = useState<Branch[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    
    // Dialog states
    const [isSupplierDialogOpen, setIsSupplierDialogOpen] = useState(false);
    const [isPODialogOpen, setIsPODialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
    const [deletingItem, setDeletingItem] = useState<any>(null);

    // Separate search terms for each tab
    const [supplierSearchTerm, setSupplierSearchTerm] = useState('');
    const [poSearchTerm, setPOSearchTerm] = useState('');

    // Supplier form state
    const [supplierName, setSupplierName] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [supplierPhone, setSupplierPhone] = useState('');
    const [supplierEmail, setSupplierEmail] = useState('');
    const [supplierAddress, setSupplierAddress] = useState('');
    const [paymentTerms, setPaymentTerms] = useState('');
    const [supplierActive, setSupplierActive] = useState(true);

    // Purchase Order form state
    const [poNumber, setPONumber] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [selectedBranch, setSelectedBranch] = useState('');
    const [expectedDelivery, setExpectedDelivery] = useState('');
    const [poNotes, setPONotes] = useState('');

    useEffect(() => {
        setMounted(true);
    }, []);

    // ===== SUPABASE DIRECT API CALLS =====
    
    // ✅ OPTIMIZED: Replace fetchSuppliers (around line 367)
    const fetchSuppliers = useCallback(async () => {
        if (!supabase) return;
        setIsSupplierLoading(true);
        
        try {
            // 🔥 Single optimized RPC call with calculated totals!
            const { data, error } = await supabase
                .rpc('get_suppliers_complete');

            if (error) {
                setSupplierError(`Could not fetch suppliers: ${error.message}`);
                setSuppliers([]);
            } else {
                setSuppliers((data || []) as Supplier[]);
                setSupplierError(null);
            }
        } catch (error: any) {
            setSupplierError('Network error');
            setSuppliers([]);
        }
        
        setIsSupplierLoading(false);
        setLastUpdated(new Date());
    }, []);

    // ✅ OPTIMIZED: Replace fetchPurchaseOrders (around line 389)
    const fetchPurchaseOrders = useCallback(async () => {
        if (!supabase) return;
        setIsPOLoading(true);
        
        try {
            // 🔥 Single optimized RPC call with all joins and calculated total!
            const { data, error } = await supabase
                .rpc('get_purchase_orders_complete');

            if (error) {
                setPOError(`Could not fetch purchase orders: ${error.message}`);
                setPurchaseOrders([]);
            } else {
                setPurchaseOrders((data || []) as any);
                setPOError(null);
            }
        } catch (error: any) {
            setPOError('Network error');
            setPurchaseOrders([]);
        }
        
        setIsPOLoading(false);
        setLastUpdated(new Date());
    }, []);

    const fetchSupportingData = useCallback(async () => {
        if (!supabase) return;
        
        const [branchesRes, inventoryRes, usersRes] = await Promise.all([
            supabase.from('branch').select('branch_id, name').eq('is_active', true),
            supabase.from('inventory_item').select('item_id, name, category'),
            supabase.from('user').select('user_id, name').in('role', ['admin', 'manager'])
        ]);

        if (branchesRes.data) setBranches(branchesRes.data as Branch[]);
        if (inventoryRes.data) setInventory(inventoryRes.data as InventoryItem[]);
        if (usersRes.data) setUsers(usersRes.data as User[]);
    }, []);

    // Optimized filter functions with useMemo
    const filteredSuppliers = useMemo(() => {
        return suppliers.filter(supplier => {
            const matchesSearch = supplier.name.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                                supplier.contact_person?.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                                supplier.phone?.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                                supplier.email?.toLowerCase().includes(supplierSearchTerm.toLowerCase()) ||
                                supplier.address?.toLowerCase().includes(supplierSearchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [suppliers, supplierSearchTerm]);

    const filteredPurchaseOrders = useMemo(() => {
        return purchaseOrders.filter(po => {
            const matchesSearch = po.po_number.toLowerCase().includes(poSearchTerm.toLowerCase()) ||
                                po.supplier?.name.toLowerCase().includes(poSearchTerm.toLowerCase()) ||
                                po.branch?.name.toLowerCase().includes(poSearchTerm.toLowerCase());
            return matchesSearch;
        });
    }, [purchaseOrders, poSearchTerm]);

    const handleRefresh = () => {
        fetchSuppliers();
        fetchPurchaseOrders();
        fetchSupportingData();
    };

    useEffect(() => {
        fetchSuppliers();
        fetchPurchaseOrders();
        fetchSupportingData();
    }, [fetchSuppliers, fetchPurchaseOrders, fetchSupportingData]);

    const resetSupplierForm = () => {
        setSupplierName('');
        setContactPerson('');
        setSupplierPhone('');
        setSupplierEmail('');
        setSupplierAddress('');
        setPaymentTerms('');
        setSupplierActive(true);
        setEditingSupplier(null);
    };

    const resetPOForm = () => {
        setPONumber('');
        setSelectedSupplier('');
        setSelectedBranch('');
        setExpectedDelivery('');
        setPONotes('');
        setEditingPO(null);
    };

    const handleOpenSupplierDialog = () => {
        resetSupplierForm();
        setIsSupplierDialogOpen(true);
    };

    const handleOpenPODialog = () => {
        resetPOForm();
        setIsPODialogOpen(true);
    };

    const handleEditSupplier = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setSupplierName(supplier.name);
        setContactPerson(supplier.contact_person || '');
        setSupplierPhone(supplier.phone || '');
        setSupplierEmail(supplier.email || '');
        setSupplierAddress(supplier.address || '');
        setPaymentTerms(supplier.payment_terms || '');
        setSupplierActive(supplier.is_active);
        setIsSupplierDialogOpen(true);
    };

    const handleEditPO = (po: PurchaseOrder) => {
        setEditingPO(po);
        setPONumber(po.po_number);
        setSelectedSupplier(po.supplier_id);
        setSelectedBranch(po.branch_id);
        setExpectedDelivery(po.expected_delivery_date || '');
        setPONotes(po.notes || '');
        setIsPODialogOpen(true);
    };

    const handleDeleteItem = (item: any, type: 'supplier' | 'po') => {
        setDeletingItem({ ...item, type });
        setIsDeleteDialogOpen(true);
    };

    // Export Data Functionality
    const handleExportData = () => {
        let dataToExport: any[] = [];
        let filename = '';
        let headers: string[] = [];

        if (activeTab === 'suppliers') {
            dataToExport = filteredSuppliers;
            filename = 'suppliers_export.csv';
            headers = ['Supplier Name', 'Contact Person', 'Phone', 'Email', 'Address', 'Payment Terms', 'Status'];
        } else {
            dataToExport = filteredPurchaseOrders;
            filename = 'purchase_orders_export.csv';
            headers = ['PO Number', 'Supplier', 'Branch', 'Order Date', 'Total Amount', 'Status', 'Expected Delivery'];
        }

        if (dataToExport.length === 0) {
            toast({
                title: "No Data to Export",
                description: "There is no data available for export.",
                variant: "destructive"
            });
            return;
        }

        // Convert data to CSV format
        const csvContent = convertToCSV(dataToExport, headers, activeTab);
        
        // Create and download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({
            title: "Export Successful",
            description: `${dataToExport.length} ${activeTab === 'suppliers' ? 'suppliers' : 'purchase orders'} exported to ${filename}`,
        });
    };

    const convertToCSV = (data: any[], headers: string[], type: string) => {
        const headerRow = headers.join(',') + '\n';
        
        const dataRows = data.map(item => {
            if (type === 'suppliers') {
                return [
                    `"${item.name || ''}"`,
                    `"${item.contact_person || ''}"`,
                    `"${item.phone || ''}"`,
                    `"${item.email || ''}"`,
                    `"${item.address || ''}"`,
                    `"${item.payment_terms || ''}"`,
                    `"${item.is_active ? 'Active' : 'Inactive'}"`
                ].join(',');
            } else {
                return [
                    `"${item.po_number || ''}"`,
                    `"${item.supplier?.name || ''}"`,
                    `"${item.branch?.name || ''}"`,
                    `"${item.order_date ? new Date(item.order_date).toLocaleDateString() : ''}"`,
                    `"${Number(item.total_amount || 0).toFixed(2)}"`,
                    `"${item.status || ''}"`,
                    `"${item.expected_delivery_date || ''}"`
                ].join(',');
            }
        }).join('\n');

        return headerRow + dataRows;
    };

    const handleSubmitSupplier = async () => {
        if (!supabase || !authUser) return;
        if (!supplierName) {
            toast({ title: "Validation Error", description: "Supplier name is required.", variant: "destructive" });
            return;
        }

        setIsSupplierLoading(true);

        const supplierData = {
            name: supplierName,
            contact_person: contactPerson || null,
            phone: supplierPhone || null,
            email: supplierEmail || null,
            address: supplierAddress || null,
            payment_terms: paymentTerms || null,
            is_active: supplierActive,
        };

        try {
            let error;
            
            if (editingSupplier) {
                const { error: updateError } = await supabase
                    .from('supplier')
                    .update(supplierData)
                    .eq('supplier_id', editingSupplier.supplier_id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('supplier')
                    .insert([supplierData]);
                error = insertError;
            }

            if (error) {
                toast({ title: "Save Error", description: error.message, variant: "destructive" });
            } else {
                toast({ title: "Success", description: `Supplier ${editingSupplier ? 'updated' : 'created'} successfully.` });
                setIsSupplierDialogOpen(false);
                resetSupplierForm();
                fetchSuppliers();
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }

        setIsSupplierLoading(false);
    };

    const handleSubmitPO = async () => {
        if (!supabase || !authUser) return;
        if (!poNumber || !selectedSupplier || !selectedBranch) {
            toast({ title: "Validation Error", description: "PO Number, Supplier, and Branch are required.", variant: "destructive" });
            return;
        }

        setIsPOLoading(true);

        const poData = {
            po_number: poNumber,
            supplier_id: selectedSupplier,
            branch_id: selectedBranch,
            user_id: authUser.user_id,
            expected_delivery_date: expectedDelivery || null,
            notes: poNotes || null,
            status: 'pending',
        };

        try {
            let error;
            
            if (editingPO) {
                const { error: updateError } = await supabase
                    .from('purchase_order')
                    .update(poData)
                    .eq('po_id', editingPO.po_id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('purchase_order')
                    .insert([poData]);
                error = insertError;
            }

            if (error) {
                toast({ title: "Save Error", description: error.message, variant: "destructive" });
            } else {
                toast({ title: "Success", description: `Purchase order ${editingPO ? 'updated' : 'created'} successfully.` });
                setIsPODialogOpen(false);
                resetPOForm();
                fetchPurchaseOrders();
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }

        setIsPOLoading(false);
    };

    const handleDelete = async () => {
        if (!supabase || !deletingItem) return;

        try {
            let error;
            
            if (deletingItem.type === 'supplier') {
                const { error: deleteError } = await supabase
                    .from('supplier')
                    .delete()
                    .eq('supplier_id', deletingItem.supplier_id);
                error = deleteError;
            } else {
                const { error: deleteError } = await supabase
                    .from('purchase_order')
                    .delete()
                    .eq('po_id', deletingItem.po_id);
                error = deleteError;
            }

            if (error) {
                toast({ title: "Delete Error", description: error.message, variant: "destructive" });
            } else {
                toast({ title: "Success", description: `${deletingItem.type === 'supplier' ? 'Supplier' : 'Purchase order'} deleted successfully.` });
                setIsDeleteDialogOpen(false);
                if (deletingItem.type === 'supplier') {
                    fetchSuppliers();
                } else {
                    fetchPurchaseOrders();
                }
            }
        } catch (error: any) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        }
    };

    const renderSupplierCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'is_active') {
            return (
                <Badge variant={value ? 'default' : 'secondary'} className={`${value ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'} font-poppins`}>
                    {value ? 'Active' : 'Inactive'}
                </Badge>
            );
        }
        if (columnKey === 'contact_person' && !value) {
            return <span className="text-slate-400">No contact</span>;
        }
        if (columnKey === 'phone' && !value) {
            return <span className="text-slate-400">No phone</span>;
        }
        if (columnKey === 'email' && !value) {
            return <span className="text-slate-400">No email</span>;
        }
        if (columnKey === 'payment_terms' && !value) {
            return <span className="text-slate-400">No terms</span>;
        }
        return String(value || '');
    };

    const renderPOCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'supplier_name') {
            return item.supplier?.name || 'Unknown Supplier';
        }
        if (columnKey === 'branch_name') {
            return item.branch?.name || 'Unknown Branch';
        }
        if (columnKey === 'order_date') {
            return value ? new Date(value).toLocaleDateString() : 'No date';
        }
        if (columnKey === 'total_amount') {
            return `₱${Number(value || 0).toFixed(2)}`;
        }
        if (columnKey === 'status') {
            const status = value as string;
            let color = '';
            if (status === 'pending') color = 'bg-yellow-100 text-yellow-700 border-yellow-200';
            if (status === 'approved') color = 'bg-blue-100 text-blue-700 border-blue-200';
            if (status === 'ordered') color = 'bg-purple-100 text-purple-700 border-purple-200';
            if (status === 'delivered') color = 'bg-green-100 text-green-700 border-green-200';
            if (status === 'cancelled') color = 'bg-red-100 text-red-700 border-red-200';
            return <Badge variant="outline" className={`capitalize ${color} font-poppins`}>{status || 'pending'}</Badge>;
        }
        return String(value || '');
    };

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
                            <h1 className="text-4xl font-bold text-white mb-3 drop-shadow-2xl font-poppins tracking-tight">
                                Purchasing & Supplier Management
                            </h1>
                            <div className="flex items-center gap-6 text-white/90">
                                <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium font-poppins">
                                    <ShoppingCart className="h-6 w-6 opacity-90" />
                                    Manage suppliers, purchase orders, and deliveries
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
                            disabled={isSupplierLoading || isPOLoading}
                            className={buttonStyles.glass + " active:scale-95 font-poppins"}
                        >
                            <RefreshCw className={`h-6 w-6 mr-3 ${isSupplierLoading || isPOLoading ? 'animate-spin' : ''}`} />
                            Refresh Data
                        </Button>
                    </div>
                </div>

                <div className="mt-12"></div>
                
                {/* Stats Overview */}
                <StatsOverview suppliers={suppliers} purchaseOrders={purchaseOrders} />

                {/* Quick Actions */}
                <QuickActions 
                    onAddSupplier={handleOpenSupplierDialog} 
                    onAddPO={handleOpenPODialog}
                    onExportData={handleExportData}
                />

                <EnhancedTabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsContent value="suppliers" className="space-y-6">
                        <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                            <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-purple-50/50 border-b border-slate-200/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-slate-900 font-poppins">Supplier Management</CardTitle>
                                        <CardDescription className="text-slate-600 font-poppins">
                                            {filteredSuppliers.length} of {suppliers.length} supplier{filteredSuppliers.length !== 1 ? 's' : ''} shown
                                        </CardDescription>
                                    </div>
                                </div>

                                {/* Filter Bar */}
                                <div className="flex flex-col sm:flex-row gap-4 mt-6 p-4 bg-white/60 rounded-xl border border-slate-200/50">
                                    <div className="flex-1">
                                        <Label htmlFor="search-suppliers" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Search Suppliers</Label>
                                        <SearchInput 
                                            id="search-suppliers"
                                            value={supplierSearchTerm}
                                            onChange={setSupplierSearchTerm}
                                            placeholder="Search by name, contact, phone, email, or address..."
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-6">
                                {supplierError && (
                                    <Alert variant="destructive" className="mb-6 font-poppins">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{supplierError}</AlertDescription>
                                    </Alert>
                                )}

                                {(isSupplierLoading && suppliers.length === 0) ? (
                                    <div className="flex justify-center items-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <DataTableWrapper
                                        title=""
                                        columns={supplierColumns}
                                        data={filteredSuppliers.map(supplier => ({ ...supplier, id: supplier.supplier_id }))}
                                        onAddNew={handleOpenSupplierDialog}
                                        onEdit={handleEditSupplier}
                                        onDelete={(item) => handleDeleteItem(item, 'supplier')}
                                        renderCell={renderSupplierCell}
                                        searchTerm={supplierSearchTerm}
                                        onSearchChange={setSupplierSearchTerm}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="purchase-orders" className="space-y-6">
                        <Card className="bg-white/90 backdrop-blur-sm border-slate-200/80 shadow-2xl rounded-3xl overflow-hidden border-0">
                            <CardHeader className="pb-4 bg-gradient-to-r from-slate-50 to-blue-50/50 border-b border-slate-200/50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-slate-900 font-poppins">Purchase Orders</CardTitle>
                                        <CardDescription className="text-slate-600 font-poppins">
                                            {filteredPurchaseOrders.length} of {purchaseOrders.length} purchase order{filteredPurchaseOrders.length !== 1 ? 's' : ''} shown
                                        </CardDescription>
                                    </div>
                                </div>

                                {/* Filter Bar */}
                                <div className="flex flex-col sm:flex-row gap-4 mt-6 p-4 bg-white/60 rounded-xl border border-slate-200/50">
                                    <div className="flex-1">
                                        <Label htmlFor="search-pos" className="text-sm font-medium text-slate-700 mb-2 block font-poppins">Search Purchase Orders</Label>
                                        <SearchInput 
                                            id="search-pos"
                                            value={poSearchTerm}
                                            onChange={setPOSearchTerm}
                                            placeholder="Search by PO number, supplier, or branch..."
                                        />
                                    </div>
                                </div>
                            </CardHeader>
                            
                            <CardContent className="p-6">
                                {poError && (
                                    <Alert variant="destructive" className="mb-6 font-poppins">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>{poError}</AlertDescription>
                                    </Alert>
                                )}

                                {(isPOLoading && purchaseOrders.length === 0) ? (
                                    <div className="flex justify-center items-center h-64">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <DataTableWrapper
                                        title=""
                                        columns={poColumns}
                                        data={filteredPurchaseOrders.map(po => ({ ...po, id: po.po_id }))}
                                        onAddNew={handleOpenPODialog}
                                        onEdit={handleEditPO}
                                        onDelete={(item) => handleDeleteItem(item, 'po')}
                                        renderCell={renderPOCell}
                                        searchTerm={poSearchTerm}
                                        onSearchChange={setPOSearchTerm}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </EnhancedTabs>

                {/* Enhanced Supplier Dialog */}
                <Dialog open={isSupplierDialogOpen} onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setIsSupplierDialogOpen(false);
                        resetSupplierForm();
                    }
                }}>
                    <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-poppins">
                                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                            </DialogTitle>
                            <DialogDescription className="text-slate-600 font-poppins">
                                {editingSupplier ? `Update details for ${editingSupplier.name}.` : 'Enter the details for the new supplier.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="supplier-name" className="text-slate-700 font-medium font-poppins">Supplier Name *</Label>
                                <Input 
                                    id="supplier-name" 
                                    value={supplierName} 
                                    onChange={(e) => setSupplierName(e.target.value)} 
                                    placeholder="Neugen Tire Sales Inc"
                                    className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact-person" className="text-slate-700 font-medium font-poppins">Contact Person</Label>
                                <Input 
                                    id="contact-person" 
                                    value={contactPerson} 
                                    onChange={(e) => setContactPerson(e.target.value)} 
                                    placeholder="John Smith"
                                    className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="supplier-phone" className="text-slate-700 font-medium font-poppins">Phone</Label>
                                    <Input 
                                        id="supplier-phone" 
                                        value={supplierPhone} 
                                        onChange={(e) => setSupplierPhone(e.target.value)} 
                                        placeholder="+1-555-0201"
                                        className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supplier-email" className="text-slate-700 font-medium font-poppins">Email</Label>
                                    <Input 
                                        id="supplier-email" 
                                        type="email"
                                        value={supplierEmail} 
                                        onChange={(e) => setSupplierEmail(e.target.value)} 
                                        placeholder="orders@neugen.com"
                                        className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="supplier-address" className="text-slate-700 font-medium font-poppins">Address</Label>
                                <Textarea 
                                    id="supplier-address" 
                                    value={supplierAddress} 
                                    onChange={(e) => setSupplierAddress(e.target.value)} 
                                    placeholder="789 Tire Street, City"
                                    className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="payment-terms" className="text-slate-700 font-medium font-poppins">Payment Terms</Label>
                                <Input 
                                    id="payment-terms" 
                                    value={paymentTerms} 
                                    onChange={(e) => setPaymentTerms(e.target.value)} 
                                    placeholder="Net 30"
                                    className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch 
                                    id="supplier-active" 
                                    checked={supplierActive} 
                                    onCheckedChange={setSupplierActive}
                                />
                                <Label htmlFor="supplier-active" className="text-slate-700 font-medium font-poppins">Active Supplier</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className={buttonStyles.back}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button onClick={handleSubmitSupplier} disabled={isSupplierLoading} className={buttonStyles.primary}>
                                {isSupplierLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingSupplier ? 'Save Changes' : 'Create Supplier'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Enhanced Purchase Order Dialog */}
                <Dialog open={isPODialogOpen} onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setIsPODialogOpen(false);
                        resetPOForm();
                    }
                }}>
                    <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-poppins">
                                {editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}
                            </DialogTitle>
                            <DialogDescription className="text-slate-600 font-poppins">
                                {editingPO ? `Update details for PO ${editingPO.po_number}.` : 'Enter the details for the new purchase order.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="po-number" className="text-slate-700 font-medium font-poppins">PO Number *</Label>
                                <Input 
                                    id="po-number" 
                                    value={poNumber} 
                                    onChange={(e) => setPONumber(e.target.value)} 
                                    placeholder="PO-2024-001"
                                    className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="supplier" className="text-slate-700 font-medium font-poppins">Supplier *</Label>
                                    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                        <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                            <SelectValue placeholder="Select supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.filter(s => s.is_active).map(supplier => (
                                                <SelectItem key={supplier.supplier_id} value={supplier.supplier_id} className="font-poppins">
                                                    {supplier.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="branch" className="text-slate-700 font-medium font-poppins">Branch *</Label>
                                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                        <SelectTrigger className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins">
                                            <SelectValue placeholder="Select branch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map(branch => (
                                                <SelectItem key={branch.branch_id} value={branch.branch_id} className="font-poppins">
                                                    {branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expected-delivery" className="text-slate-700 font-medium font-poppins">Expected Delivery Date</Label>
                                <CustomDateInput
                                    id="expected-delivery"
                                    value={expectedDelivery}
                                    onChange={setExpectedDelivery}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="po-notes" className="text-slate-700 font-medium font-poppins">Notes</Label>
                                <Textarea 
                                    id="po-notes" 
                                    value={poNotes} 
                                    onChange={(e) => setPONotes(e.target.value)} 
                                    placeholder="Additional notes for this purchase order..."
                                    className="border-slate-300 focus:border-purple-500 hover:border-cyan-500 focus:ring-2 focus:ring-purple-200 transition-all duration-300 bg-white/80 font-poppins"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className={buttonStyles.back}>
                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                    Cancel
                                </Button>
                            </DialogClose>
                            <Button onClick={handleSubmitPO} disabled={isPOLoading} className={buttonStyles.primary}>
                                {isPOLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {editingPO ? 'Save Changes' : 'Create PO'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Enhanced Delete Confirmation Dialog */}
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent className="bg-gradient-to-br from-white to-slate-100 border-0 shadow-2xl mt-20 font-poppins">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-slate-900 font-poppins">Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-600 font-poppins">
                                Are you sure you want to delete this {deletingItem?.type === 'supplier' ? 'supplier' : 'purchase order'}? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className={buttonStyles.back}>
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={handleDelete} 
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-red-600 active:scale-95 font-poppins"
                            >
                                Delete
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

                /* Custom date input styling */
                .custom-date-input::-webkit-calendar-picker-indicator {
                    background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="%236b7280" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>');
                    cursor: pointer;
                    padding: 4px;
                    border-radius: 4px;
                }

                .custom-date-input::-webkit-calendar-picker-indicator:hover {
                    background-color: #f3f4f6;
                }

                /* Improved focus styles for all inputs */
                input:focus, textarea:focus, select:focus {
                    outline: none;
                    ring: 2px;
                }

                /* Smooth transitions for all interactive elements */
                button, input, select, textarea {
                    transition: all 0.3s ease;
                }
            `}</style>
        </div>
    );
}