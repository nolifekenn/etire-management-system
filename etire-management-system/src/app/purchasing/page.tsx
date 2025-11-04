"use client";

import { useState, useEffect, useCallback } from 'react';
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
  Calendar, Phone, Mail, MapPin, FileText, CheckCircle, Clock4, TruckIcon
} from 'lucide-react';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Supplier, PurchaseOrder, Branch, InventoryItem, User } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

// ... rest of your code stays exactly the same
// ===== DESIGN SYSTEM =====
const buttonStyles = {
  primary: "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border-0 shadow-lg hover:shadow-xl",
  secondary: "flex items-center gap-2 min-h-[44px] bg-white border border-slate-300 hover:border-indigo-400 hover:text-indigo-600 text-slate-700 px-4 py-2 rounded-lg font-medium transition-all duration-300 active:scale-95",
  glass: "bg-white/25 backdrop-blur-lg border border-white/30 hover:bg-white/35 text-white px-6 py-3 rounded-2xl font-semibold transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg"
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
              <p className="text-purple-100 text-sm font-medium">Active Suppliers</p>
              <p className="text-3xl font-bold mt-2">{activeSuppliers}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-purple-100 text-sm">
            <TrendingUp className="h-4 w-4" />
            <span>All active partners</span>
          </div>
        </div>
  
        <div className={`bg-gradient-to-br from-blue-500 via-blue-600 to-sky-700 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Pending POs</p>
              <p className="text-3xl font-bold mt-2">{pendingPOs}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Clock4 className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-blue-100 text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>Awaiting approval</span>
          </div>
        </div>
  
        <div className={`bg-gradient-to-br from-teal-400 via-cyan-500 to-green-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-teal-100 text-sm font-medium">Delivered This Month</p>
              <p className="text-3xl font-bold mt-2">{deliveredThisMonth}</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <TruckIcon className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-teal-100 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>Successful deliveries</span>
          </div>
        </div>
  
        <div className={`bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-all duration-300 ${microAnimations.cardHover}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total PO Value</p>
              <p className="text-3xl font-bold mt-2">₱{(totalPOValue / 1000).toFixed(0)}K</p>
            </div>
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <ShoppingCart className="h-6 w-6" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-purple-100 text-sm">
            <TrendingUp className="h-4 w-4" />
            <span>This year</span>
          </div>
        </div>
      </div>
    );
};

const QuickActions = ({ onAddSupplier, onAddPO }: { onAddSupplier: () => void, onAddPO: () => void }) => {
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
      onClick: () => {},
      color: "from-green-500 to-emerald-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {actions.map((action, index) => (
        <button
          key={action.label}
          onClick={action.onClick}
          className={`bg-gradient-to-r ${action.color} rounded-xl p-4 text-white text-left shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group`}
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
    <Tabs value={value} onValueChange={onValueChange} className="w-full">
      <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 rounded-2xl">
        <TabsTrigger 
          value="suppliers" 
          className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-700 transition-all duration-300"
        >
          <Building2 className="h-4 w-4 mr-2" />
          Suppliers
        </TabsTrigger>
        <TabsTrigger 
          value="purchase-orders" 
          className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-700 transition-all duration-300"
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
    
    const fetchSuppliers = useCallback(async () => {
        if (!supabase) return;
        setIsSupplierLoading(true);
        
        try {
            const { data, error } = await supabase
                .from('supplier')
                .select('*')
                .order('name');
            
            if (error) {
                setSupplierError(error.message);
                setSuppliers([]);
            } else {
                setSuppliers(data as Supplier[]);
                setSupplierError(null);
            }
        } catch (error: any) {
            setSupplierError('Network error');
            setSuppliers([]);
        }
        
        setIsSupplierLoading(false);
        setLastUpdated(new Date());
    }, []);

    const fetchPurchaseOrders = useCallback(async () => {
        if (!supabase) return;
        setIsPOLoading(true);
        
        try {
            const { data, error } = await supabase
                .from('purchase_order')
                .select(`
                    *,
                    supplier:supplier_id(name),
                    branch:branch_id(name),
                    user:user_id(name)
                `)
                .order('order_date', { ascending: false });
            
            if (error) {
                setPOError(error.message);
                setPurchaseOrders([]);
            } else {
                setPurchaseOrders(data as any);
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
                <Badge variant={value ? 'default' : 'secondary'} className={value ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-100 text-red-700 border-red-200'}>
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
            return <Badge variant="outline" className={`capitalize ${color}`}>{status || 'pending'}</Badge>;
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
                                <p className="flex items-center gap-3 drop-shadow-md text-xl font-medium">
                                    <ShoppingCart className="h-6 w-6 opacity-90" />
                                    Manage suppliers, purchase orders, and deliveries
                                </p>
                                <div className="flex items-center gap-4 text-lg">
                                    {lastUpdated && (
                                        <div className="flex items-center gap-2 text-white/90 bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
                                            <Clock className="w-5 h-5" />
                                            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-green-300 bg-green-900/40 px-4 py-2 rounded-full backdrop-blur-sm">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        Live data
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <Button 
                            onClick={handleRefresh}
                            disabled={isSupplierLoading || isPOLoading}
                            className={buttonStyles.glass + " active:scale-95"}
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
                <QuickActions onAddSupplier={handleOpenSupplierDialog} onAddPO={handleOpenPODialog} />

                <EnhancedTabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsContent value="suppliers" className="space-y-6">
                        <Card className="bg-white border-slate-200 shadow-lg transition-all duration-300 hover:shadow-xl">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-slate-900">Supplier Management</CardTitle>
                                        <CardDescription className="text-slate-600">
                                            Manage your supplier partners and their information
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {supplierError && (
                                    <Alert variant="destructive" className="m-6">
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
                                        data={suppliers.map(supplier => ({ ...supplier, id: supplier.supplier_id }))}
                                        onAddNew={handleOpenSupplierDialog}
                                        onEdit={handleEditSupplier}
                                        onDelete={(item) => handleDeleteItem(item, 'supplier')}
                                        renderCell={renderSupplierCell}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="purchase-orders" className="space-y-6">
                        <Card className="bg-white border-slate-200 shadow-lg transition-all duration-300 hover:shadow-xl">
                            <CardHeader className="pb-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle className="text-2xl font-bold text-slate-900">Purchase Orders</CardTitle>
                                        <CardDescription className="text-slate-600">
                                            Create and manage purchase orders for inventory
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                {poError && (
                                    <Alert variant="destructive" className="m-6">
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
                                        data={purchaseOrders.map(po => ({ ...po, id: po.po_id }))}
                                        onAddNew={handleOpenPODialog}
                                        onEdit={handleEditPO}
                                        onDelete={(item) => handleDeleteItem(item, 'po')}
                                        renderCell={renderPOCell}
                                    />
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </EnhancedTabs>

                {/* Supplier Dialog */}
                <Dialog open={isSupplierDialogOpen} onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setIsSupplierDialogOpen(false);
                        resetSupplierForm();
                    }
                }}>
                    <DialogContent className="sm:max-w-lg bg-gradient-to-br from-slate-50 to-indigo-50/30 border-0 shadow-2xl mt-20">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                            </DialogTitle>
                            <DialogDescription className="text-slate-600">
                                {editingSupplier ? `Update details for ${editingSupplier.name}.` : 'Enter the details for the new supplier.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="supplier-name" className="text-slate-700 font-medium">Supplier Name *</Label>
                                <Input 
                                    id="supplier-name" 
                                    value={supplierName} 
                                    onChange={(e) => setSupplierName(e.target.value)} 
                                    placeholder="Neugen Tire Sales Inc"
                                    className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="contact-person" className="text-slate-700 font-medium">Contact Person</Label>
                                <Input 
                                    id="contact-person" 
                                    value={contactPerson} 
                                    onChange={(e) => setContactPerson(e.target.value)} 
                                    placeholder="John Smith"
                                    className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="supplier-phone" className="text-slate-700 font-medium">Phone</Label>
                                    <Input 
                                        id="supplier-phone" 
                                        value={supplierPhone} 
                                        onChange={(e) => setSupplierPhone(e.target.value)} 
                                        placeholder="+1-555-0201"
                                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="supplier-email" className="text-slate-700 font-medium">Email</Label>
                                    <Input 
                                        id="supplier-email" 
                                        type="email"
                                        value={supplierEmail} 
                                        onChange={(e) => setSupplierEmail(e.target.value)} 
                                        placeholder="orders@neugen.com"
                                        className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="supplier-address" className="text-slate-700 font-medium">Address</Label>
                                <Textarea 
                                    id="supplier-address" 
                                    value={supplierAddress} 
                                    onChange={(e) => setSupplierAddress(e.target.value)} 
                                    placeholder="789 Tire Street, City"
                                    className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="payment-terms" className="text-slate-700 font-medium">Payment Terms</Label>
                                <Input 
                                    id="payment-terms" 
                                    value={paymentTerms} 
                                    onChange={(e) => setPaymentTerms(e.target.value)} 
                                    placeholder="Net 30"
                                    className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80"
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch 
                                    id="supplier-active" 
                                    checked={supplierActive} 
                                    onCheckedChange={setSupplierActive}
                                />
                                <Label htmlFor="supplier-active" className="text-slate-700 font-medium">Active Supplier</Label>
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className={buttonStyles.secondary}>
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

                {/* Purchase Order Dialog */}
                <Dialog open={isPODialogOpen} onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        setIsPODialogOpen(false);
                        resetPOForm();
                    }
                }}>
                    <DialogContent className="sm:max-w-lg bg-gradient-to-br from-slate-50 to-indigo-50/30 border-0 shadow-2xl mt-20">
                        <DialogHeader>
                            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                {editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}
                            </DialogTitle>
                            <DialogDescription className="text-slate-600">
                                {editingPO ? `Update details for PO ${editingPO.po_number}.` : 'Enter the details for the new purchase order.'}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="po-number" className="text-slate-700 font-medium">PO Number *</Label>
                                <Input 
                                    id="po-number" 
                                    value={poNumber} 
                                    onChange={(e) => setPONumber(e.target.value)} 
                                    placeholder="PO-2024-001"
                                    className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="supplier" className="text-slate-700 font-medium">Supplier *</Label>
                                    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                        <SelectTrigger className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80">
                                            <SelectValue placeholder="Select supplier" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.filter(s => s.is_active).map(supplier => (
                                                <SelectItem key={supplier.supplier_id} value={supplier.supplier_id}>
                                                    {supplier.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="branch" className="text-slate-700 font-medium">Branch *</Label>
                                    <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                        <SelectTrigger className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80">
                                            <SelectValue placeholder="Select branch" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {branches.map(branch => (
                                                <SelectItem key={branch.branch_id} value={branch.branch_id}>
                                                    {branch.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expected-delivery" className="text-slate-700 font-medium">Expected Delivery Date</Label>
                                <Input 
                                    id="expected-delivery" 
                                    type="date"
                                    value={expectedDelivery} 
                                    onChange={(e) => setExpectedDelivery(e.target.value)} 
                                    className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="po-notes" className="text-slate-700 font-medium">Notes</Label>
                                <Textarea 
                                    id="po-notes" 
                                    value={poNotes} 
                                    onChange={(e) => setPONotes(e.target.value)} 
                                    placeholder="Additional notes for this purchase order..."
                                    className="border-slate-300 focus:border-indigo-400 transition-all duration-300 bg-white/80"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="outline" className={buttonStyles.secondary}>
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

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                    <AlertDialogContent className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border-0 shadow-2xl mt-20">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-slate-900">Confirm Deletion</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-600">
                                Are you sure you want to delete this {deletingItem?.type === 'supplier' ? 'supplier' : 'purchase order'}? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className={buttonStyles.secondary}>
                                Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={handleDelete} 
                                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-300 border border-red-600 active:scale-95"
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
            `}</style>
        </div>
    );
}