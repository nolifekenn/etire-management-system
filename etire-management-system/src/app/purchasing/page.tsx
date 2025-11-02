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
import { Loader2, PlusCircle, AlertTriangle, Package, Truck, ShoppingCart, Users, Building2 } from 'lucide-react';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Supplier, PurchaseOrder, Branch, InventoryItem, User } from '@/lib/types';

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

export default function PurchasingPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [activeTab, setActiveTab] = useState('suppliers');
    
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

    const fetchSuppliers = useCallback(async () => {
        setIsSupplierLoading(true);
        try {
            const res = await fetch('/purchasing/api');
            const data = await res.json();
            
            if (!res.ok) {
                setSupplierError(data.error?.message || 'Failed to fetch suppliers');
                setSuppliers([]);
            } else {
                setSuppliers(data);
                setSupplierError(null);
            }
        } catch (error) {
            setSupplierError('Network error');
            setSuppliers([]);
        }
        setIsSupplierLoading(false);
    }, []);

    const fetchPurchaseOrders = useCallback(async () => {
        setIsPOLoading(true);
        try {
            const res = await fetch('/purchasing/api?type=purchase-orders');
            const data = await res.json();
            
            if (!res.ok) {
                setPOError(data.error?.message || 'Failed to fetch purchase orders');
                setPurchaseOrders([]);
            } else {
                setPurchaseOrders(data);
                setPOError(null);
            }
        } catch (error) {
            setPOError('Network error');
            setPurchaseOrders([]);
        }
        setIsPOLoading(false);
    }, []);

    const fetchSupportingData = useCallback(async () => {
        if (!supabase) return;
        
        const [branchesRes, inventoryRes, usersRes] = await Promise.all([
            supabase.from('branch').select('branch_id, name').eq('is_active', true),
            supabase.from('inventory_item').select('item_id, name, category'),
            supabase.from('user').select('user_id, name').in('role', [1, 2])
        ]);

        if (branchesRes.data) setBranches(branchesRes.data as Branch[]);
        if (inventoryRes.data) setInventory(inventoryRes.data as InventoryItem[]);
        if (usersRes.data) setUsers(usersRes.data as User[]);
    }, []);

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
    if (!authUser) return;
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
        const method = editingSupplier ? 'PATCH' : 'POST';
        const body = editingSupplier 
            ? { supplier_id: editingSupplier.supplier_id, ...supplierData }
            : supplierData;

        const res = await fetch('/purchasing/api', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
            toast({ title: "Save Error", description: data.error?.message || 'Failed to save supplier', variant: "destructive" });
        } else {
            toast({ title: "Success", description: `Supplier ${editingSupplier ? 'updated' : 'created'} successfully.` });
            setIsSupplierDialogOpen(false);
            resetSupplierForm();
            fetchSuppliers();
        }
    } catch (error) {
        toast({ title: "Error", description: "Network error", variant: "destructive" });
    }

    setIsSupplierLoading(false);
};

const handleSubmitPO = async () => {
    if (!authUser) return;
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
        // REMOVE total_amount: 0 - column doesn't exist
    };

    try {
        const method = editingPO ? 'PATCH' : 'POST';
        const body = editingPO 
            ? { po_id: editingPO.po_id, ...poData }
            : poData;

        const res = await fetch('/purchasing/api?type=purchase-orders', {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });

        const data = await res.json();

        if (!res.ok) {
            toast({ title: "Save Error", description: data.error?.message || 'Failed to save purchase order', variant: "destructive" });
        } else {
            toast({ title: "Success", description: `Purchase order ${editingPO ? 'updated' : 'created'} successfully.` });
            setIsPODialogOpen(false);
            resetPOForm();
            fetchPurchaseOrders();
        }
    } catch (error) {
        toast({ title: "Error", description: "Network error", variant: "destructive" });
    }

    setIsPOLoading(false);
};

// Replace handleDelete (around line 295)
const handleDelete = async () => {
    if (!deletingItem) return;

    try {
        let url = '/purchasing/api?';
        
        if (deletingItem.type === 'supplier') {
            url += `supplier_id=${deletingItem.supplier_id}`;
        } else {
            url += `type=purchase-orders&po_id=${deletingItem.po_id}`;
        }
        
        const res = await fetch(url, {
            method: 'DELETE',
        });

        const data = await res.json();

        if (!res.ok) {
            toast({ title: "Delete Error", description: data.error?.message || 'Failed to delete', variant: "destructive" });
        } else {
            toast({ title: "Success", description: `${deletingItem.type} deleted successfully.` });
            setIsDeleteDialogOpen(false);
            if (deletingItem.type === 'supplier') {
                fetchSuppliers();
            } else {
                fetchPurchaseOrders();
            }
        }
    } catch (error) {
        toast({ title: "Error", description: "Network error", variant: "destructive" });
    }
};

    const renderSupplierCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'is_active') {
            return (
                <Badge variant={value ? 'default' : 'secondary'}>
                    {value ? 'Active' : 'Inactive'}
                </Badge>
            );
        }
        if (columnKey === 'contact_person' && !value) {
            return <span className="text-muted-foreground">No contact</span>;
        }
        if (columnKey === 'phone' && !value) {
            return <span className="text-muted-foreground">No phone</span>;
        }
        if (columnKey === 'email' && !value) {
            return <span className="text-muted-foreground">No email</span>;
        }
        if (columnKey === 'payment_terms' && !value) { // Add this condition
            return <span className="text-muted-foreground">No terms</span>;
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
            if (status === 'pending') color = 'bg-yellow-100 text-yellow-700';
            if (status === 'approved') color = 'bg-blue-100 text-blue-700';
            if (status === 'ordered') color = 'bg-purple-100 text-purple-700';
            if (status === 'delivered') color = 'bg-green-100 text-green-700';
            if (status === 'cancelled') color = 'bg-red-100 text-red-700';
            return <Badge className={`capitalize ${color}`}>{status || 'pending'}</Badge>;
        }
        return String(value || '');
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <PageHeader 
                title="Purchasing & Supplier Management" 
                description="Manage suppliers, purchase orders, and deliveries."
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
                    <TabsTrigger value="purchase-orders">Purchase Orders</TabsTrigger>
                </TabsList>

                <TabsContent value="suppliers" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Supplier Management</h3>
                        <Button size="sm" onClick={handleOpenSupplierDialog} disabled={isSupplierLoading}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Supplier
                        </Button>
                    </div>

                    {supplierError && (
                        <Alert variant="destructive">
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
                            title="Suppliers"
                            columns={supplierColumns}
                            data={suppliers.map(supplier => ({ ...supplier, id: supplier.supplier_id }))}
                            onAddNew={handleOpenSupplierDialog}
                            onEdit={handleEditSupplier}
                            onDelete={(item) => handleDeleteItem(item, 'supplier')}
                            renderCell={renderSupplierCell}
                        />
                    )}
                </TabsContent>

                <TabsContent value="purchase-orders" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Purchase Orders</h3>
                        <Button size="sm" onClick={handleOpenPODialog} disabled={isPOLoading}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Create PO
                        </Button>
                    </div>

                    {poError && (
                        <Alert variant="destructive">
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
                            title="Purchase Orders"
                            columns={poColumns}
                            data={purchaseOrders.map(po => ({ ...po, id: po.po_id }))}
                            onAddNew={handleOpenPODialog}
                            onEdit={handleEditPO}
                            onDelete={(item) => handleDeleteItem(item, 'po')}
                            renderCell={renderPOCell}
                        />
                    )}
                </TabsContent>
            </Tabs>

            {/* Supplier Dialog */}
            <Dialog open={isSupplierDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setIsSupplierDialogOpen(false);
                    resetSupplierForm();
                }
            }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
                        <DialogDescription>
                            {editingSupplier ? `Update details for ${editingSupplier.name}.` : 'Enter the details for the new supplier.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="supplier-name">Supplier Name *</Label>
                            <Input 
                                id="supplier-name" 
                                value={supplierName} 
                                onChange={(e) => setSupplierName(e.target.value)} 
                                placeholder="Neugen Tire Sales Inc"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="contact-person">Contact Person</Label>
                            <Input 
                                id="contact-person" 
                                value={contactPerson} 
                                onChange={(e) => setContactPerson(e.target.value)} 
                                placeholder="John Smith"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="supplier-phone">Phone</Label>
                                <Input 
                                    id="supplier-phone" 
                                    value={supplierPhone} 
                                    onChange={(e) => setSupplierPhone(e.target.value)} 
                                    placeholder="+1-555-0201"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="supplier-email">Email</Label>
                                <Input 
                                    id="supplier-email" 
                                    type="email"
                                    value={supplierEmail} 
                                    onChange={(e) => setSupplierEmail(e.target.value)} 
                                    placeholder="orders@neugen.com"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="supplier-address">Address</Label>
                            <Textarea 
                                id="supplier-address" 
                                value={supplierAddress} 
                                onChange={(e) => setSupplierAddress(e.target.value)} 
                                placeholder="789 Tire Street, City"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="payment-terms">Payment Terms</Label>
                            <Input 
                                id="payment-terms" 
                                value={paymentTerms} 
                                onChange={(e) => setPaymentTerms(e.target.value)} 
                                placeholder="Net 30"
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch 
                                id="supplier-active" 
                                checked={supplierActive} 
                                onCheckedChange={setSupplierActive}
                            />
                            <Label htmlFor="supplier-active">Active Supplier</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSubmitSupplier} disabled={isSupplierLoading}>
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
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingPO ? 'Edit Purchase Order' : 'Create Purchase Order'}</DialogTitle>
                        <DialogDescription>
                            {editingPO ? `Update details for PO ${editingPO.po_number}.` : 'Enter the details for the new purchase order.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="po-number">PO Number *</Label>
                            <Input 
                                id="po-number" 
                                value={poNumber} 
                                onChange={(e) => setPONumber(e.target.value)} 
                                placeholder="PO-2024-001"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="supplier">Supplier *</Label>
                                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                                    <SelectTrigger>
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
                                <Label htmlFor="branch">Branch *</Label>
                                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                                    <SelectTrigger>
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
                            <Label htmlFor="expected-delivery">Expected Delivery Date</Label>
                            <Input 
                                id="expected-delivery" 
                                type="date"
                                value={expectedDelivery} 
                                onChange={(e) => setExpectedDelivery(e.target.value)} 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="po-notes">Notes</Label>
                            <Textarea 
                                id="po-notes" 
                                value={poNotes} 
                                onChange={(e) => setPONotes(e.target.value)} 
                                placeholder="Additional notes for this purchase order..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSubmitPO} disabled={isPOLoading}>
                            {isPOLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingPO ? 'Save Changes' : 'Create PO'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this {deletingItem?.type}? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleDelete} 
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}