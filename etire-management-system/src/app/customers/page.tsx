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
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { Loader2, PlusCircle, AlertTriangle, Users, Car, History, Wrench } from 'lucide-react';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Customer, Vehicle, TireHistory, InventoryItem, User } from '@/lib/types';

// Customer Management
const customerColumns = [
  { key: 'name', header: 'Customer Name' },
  { key: 'phone', header: 'Phone' },
  { key: 'email', header: 'Email' },
  { key: 'address', header: 'Address' },
  { key: 'vehicle_count', header: 'Vehicles' },
];

// Vehicle Management
const vehicleColumns = [
  { key: 'plate_number', header: 'Plate Number' },
  { key: 'customer_name', header: 'Customer' },
  { key: 'make', header: 'Make' },
  { key: 'model', header: 'Model' },
  { key: 'year', header: 'Year' },
  { key: 'color', header: 'Color' },
];

// Tire History
const historyColumns = [
  { key: 'plate_number', header: 'Vehicle' },
  { key: 'item_name', header: 'Tire/Item' },
  { key: 'service_type', header: 'Service Type' },
  { key: 'service_date', header: 'Date' },
  { key: 'mileage', header: 'Mileage' },
  { key: 'created_by_name', header: 'Service By' },
];

export default function CustomersPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [activeTab, setActiveTab] = useState('customers');
    
    // Customers state
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isCustomerLoading, setIsCustomerLoading] = useState(true);
    const [customerError, setCustomerError] = useState<string | null>(null);
    
    // Vehicles state
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [isVehicleLoading, setIsVehicleLoading] = useState(true);
    const [vehicleError, setVehicleError] = useState<string | null>(null);
    
    // Tire History state
    const [tireHistory, setTireHistory] = useState<TireHistory[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(true);
    const [historyError, setHistoryError] = useState<string | null>(null);
    
    // Supporting data
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    
    // Dialog states
    const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
    const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
    const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [editingHistory, setEditingHistory] = useState<TireHistory | null>(null);
    const [deletingItem, setDeletingItem] = useState<any>(null);

    // Customer form state
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerAddress, setCustomerAddress] = useState('');

    // Vehicle form state
    const [selectedCustomer, setSelectedCustomer] = useState('');
    const [plateNumber, setPlateNumber] = useState('');
    const [make, setMake] = useState('');
    const [model, setModel] = useState('');
    const [year, setYear] = useState('');
    const [color, setColor] = useState('');

    // History form state
    const [selectedVehicle, setSelectedVehicle] = useState('');
    const [selectedItem, setSelectedItem] = useState('');
    const [serviceType, setServiceType] = useState<'repair' | 'replacement' | 'rotation' | 'balancing'>('repair');
    const [serviceDate, setServiceDate] = useState('');
    const [mileage, setMileage] = useState('');
    const [historyNotes, setHistoryNotes] = useState('');

    const fetchCustomers = useCallback(async () => {
        if (!supabase) return;
        setIsCustomerLoading(true);
        const { data, error } = await supabase
            .from('customer')
            .select('*, vehicle(vehicle_id)') // Changed to get vehicle IDs instead of count
            .order('name', { ascending: true });
    
        if (error) {
            setCustomerError(`Could not fetch customers: ${error.message}`);
            setCustomers([]);
        } else {
            setCustomers(data as any);
            setCustomerError(null);
        }
        setIsCustomerLoading(false);
    }, []);

    const fetchVehicles = useCallback(async () => {
        if (!supabase) return;
        setIsVehicleLoading(true);
        const { data, error } = await supabase
            .from('vehicle')
            .select('*, customer:customer_id(name)') // Changed from 'customers(name)' to 'customer:customer_id(name)'
            .order('plate_number', { ascending: true });

        if (error) {
            setVehicleError(`Could not fetch vehicles: ${error.message}`);
            setVehicles([]);
        } else {
            setVehicles(data as any);
            setVehicleError(null);
        }
        setIsVehicleLoading(false);
    }, []);

    const fetchTireHistory = useCallback(async () => {
        if (!supabase) return;
        setIsHistoryLoading(true);
        const { data, error } = await supabase
            .from('tire_history')
            .select('*, vehicle:vehicle_id(plate_number), inventory_item:item_id(name), user:created_by(name)')
            .order('service_date', { ascending: false });

        if (error) {
            setHistoryError(`Could not fetch tire history: ${error.message}`);
            setTireHistory([]);
        } else {
            setTireHistory(data as any);
            setHistoryError(null);
        }
        setIsHistoryLoading(false);
    }, []);

    const fetchSupportingData = useCallback(async () => {
        if (!supabase) return;
        
        const [inventoryRes, usersRes] = await Promise.all([
            supabase.from('inventory_item').select('item_id, name, category').eq('category', 'tire'),
            supabase.from('user').select('user_id, name').in('role', [1, 2])
        ]);

        if (inventoryRes.data) setInventory(inventoryRes.data as InventoryItem[]);
        if (usersRes.data) setUsers(usersRes.data as User[]);
    }, []);

    useEffect(() => {
        fetchCustomers();
        fetchVehicles();
        fetchTireHistory();
        fetchSupportingData();
    }, [fetchCustomers, fetchVehicles, fetchTireHistory, fetchSupportingData]);

    const resetCustomerForm = () => {
        setCustomerName('');
        setCustomerPhone('');
        setCustomerEmail('');
        setCustomerAddress('');
        setEditingCustomer(null);
    };

    const resetVehicleForm = () => {
        setSelectedCustomer('');
        setPlateNumber('');
        setMake('');
        setModel('');
        setYear('');
        setColor('');
        setEditingVehicle(null);
    };

    const resetHistoryForm = () => {
        setSelectedVehicle('');
        setSelectedItem('');
        setServiceType('repair');
        setServiceDate('');
        setMileage('');
        setHistoryNotes('');
        setEditingHistory(null);
    };

    const handleOpenCustomerDialog = () => {
        resetCustomerForm();
        setIsCustomerDialogOpen(true);
    };

    const handleOpenVehicleDialog = () => {
        resetVehicleForm();
        setIsVehicleDialogOpen(true);
    };

    const handleOpenHistoryDialog = () => {
        resetHistoryForm();
        setIsHistoryDialogOpen(true);
    };

    const handleEditCustomer = (customer: Customer) => {
        setEditingCustomer(customer);
        setCustomerName(customer.name);
        setCustomerPhone(customer.phone || '');
        setCustomerEmail(customer.email || '');
        setCustomerAddress(customer.address || '');
        setIsCustomerDialogOpen(true);
    };

    const handleEditVehicle = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setSelectedCustomer(vehicle.customer_id);
        setPlateNumber(vehicle.plate_number);
        setMake(vehicle.make || '');
        setModel(vehicle.model || '');
        setYear(vehicle.year?.toString() || '');
        setColor(vehicle.color || '');
        setIsVehicleDialogOpen(true);
    };

    const handleEditHistory = (history: TireHistory) => {
        setEditingHistory(history);
        setSelectedVehicle(history.vehicle_id);
        setSelectedItem(history.item_id);
        setServiceType(history.service_type);
        setServiceDate(history.service_date.split('T')[0]);
        setMileage(history.mileage?.toString() || '');
        setHistoryNotes(history.notes || '');
        setIsHistoryDialogOpen(true);
    };

    const handleDeleteItem = (item: any, type: 'customer' | 'vehicle' | 'history') => {
        setDeletingItem({ ...item, type });
        setIsDeleteDialogOpen(true);
    };

    const handleSubmitCustomer = async () => {
        if (!supabase || !authUser) return;
        if (!customerName) {
            toast({ title: "Validation Error", description: "Customer name is required.", variant: "destructive" });
            return;
        }

        setIsCustomerLoading(true);

        const customerData = {
            name: customerName,
            phone: customerPhone || null,
            email: customerEmail || null,
            address: customerAddress || null,
        };

        let error;
        if (editingCustomer) {
            const { error: updateError } = await supabase
                .from('customer') // Changed from 'customers'
                .update(customerData)
                .eq('customer_id', editingCustomer.customer_id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('customer') // Changed from 'customers'
                .insert([customerData]);
            error = insertError;
        }

        setIsCustomerLoading(false);

        if (error) {
            toast({ title: "Save Error", description: `Could not save customer: ${error.message}`, variant: "destructive" });
        } else {
            toast({ title: "Success", description: `Customer ${editingCustomer ? 'updated' : 'created'} successfully.` });
            setIsCustomerDialogOpen(false);
            fetchCustomers();
        }
    };

    const handleSubmitVehicle = async () => {
        if (!supabase || !authUser) return;
        if (!selectedCustomer || !plateNumber) {
            toast({ title: "Validation Error", description: "Customer and plate number are required.", variant: "destructive" });
            return;
        }

        setIsVehicleLoading(true);

        const vehicleData = {
            customer_id: selectedCustomer,
            plate_number: plateNumber,
            make: make || null,
            model: model || null,
            year: year ? parseInt(year) : null,
            color: color || null,
        };

        let error;
        if (editingVehicle) {
            const { error: updateError } = await supabase
                .from('vehicle')
                .update(vehicleData)
                .eq('vehicle_id', editingVehicle.vehicle_id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('vehicle')
                .insert([vehicleData]);
            error = insertError;
        }

        setIsVehicleLoading(false);

        if (error) {
            toast({ title: "Save Error", description: `Could not save vehicle: ${error.message}`, variant: "destructive" });
        } else {
            toast({ title: "Success", description: `Vehicle ${editingVehicle ? 'updated' : 'created'} successfully.` });
            setIsVehicleDialogOpen(false);
            fetchVehicles();
            fetchCustomers();
        }
    };

    const handleSubmitHistory = async () => {
        if (!supabase || !authUser) return;
        if (!selectedVehicle || !selectedItem || !serviceDate) {
            toast({ title: "Validation Error", description: "Vehicle, item, and service date are required.", variant: "destructive" });
            return;
        }

        setIsHistoryLoading(true);

        const historyData = {
            vehicle_id: selectedVehicle,
            item_id: selectedItem,
            service_type: serviceType,
            service_date: serviceDate,
            mileage: mileage ? parseInt(mileage) : null,
            notes: historyNotes || null,
            created_by: authUser.user_id,
        };

        let error;
        if (editingHistory) {
            const { error: updateError } = await supabase
                .from('tire_history')
                .update(historyData)
                .eq('history_id', editingHistory.history_id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('tire_history')
                .insert([historyData]);
            error = insertError;
        }

        setIsHistoryLoading(false);

        if (error) {
            toast({ title: "Save Error", description: `Could not save tire history: ${error.message}`, variant: "destructive" });
        } else {
            toast({ title: "Success", description: `Tire history ${editingHistory ? 'updated' : 'created'} successfully.` });
            setIsHistoryDialogOpen(false);
            fetchTireHistory();
        }
    };

    const handleDelete = async () => {
        if (!deletingItem || !supabase) return;
        
        const tableName = deletingItem.type === 'customer' ? 'customer' : 
                         deletingItem.type === 'vehicle' ? 'vehicle' : 'tire_history';
        const idField = deletingItem.type === 'customer' ? 'customer_id' : 
                       deletingItem.type === 'vehicle' ? 'vehicle_id' : 'history_id';
        
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq(idField, deletingItem[idField]);

        if (error) {
            toast({ title: "Delete Error", description: `Could not delete ${deletingItem.type}: ${error.message}`, variant: "destructive" });
        } else {
            toast({ title: "Success", description: `${deletingItem.type} deleted successfully.` });
            setIsDeleteDialogOpen(false);
            if (deletingItem.type === 'customer') {
                fetchCustomers();
            } else if (deletingItem.type === 'vehicle') {
                fetchVehicles();
                fetchCustomers();
            } else {
                fetchTireHistory();
            }
        }
    };

    const renderCustomerCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'vehicle_count') {
            // Changed from item.vehicles to item.vehicle
            return item.vehicle && Array.isArray(item.vehicle) ? item.vehicle.length : 0;
        }
        if (columnKey === 'phone' && !value) {
            return <span className="text-muted-foreground">No phone</span>;
        }
        if (columnKey === 'email' && !value) {
            return <span className="text-muted-foreground">No email</span>;
        }
        if (columnKey === 'address' && !value) {
            return <span className="text-muted-foreground">No address</span>;
        }
        return String(value || '');
    };
    const renderVehicleCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'customer_name') {
            return item.customer?.name || 'Unknown Customer'; // Changed from 'customers' to 'customer'
        }
        if (columnKey === 'year' && !value) {
            return <span className="text-muted-foreground">-</span>;
        }
        if (columnKey === 'make' && !value) {
            return <span className="text-muted-foreground">-</span>;
        }
        if (columnKey === 'model' && !value) {
            return <span className="text-muted-foreground">-</span>;
        }
        if (columnKey === 'color' && !value) {
            return <span className="text-muted-foreground">-</span>;
        }
        return String(value || '');
    };

    const renderHistoryCell = (item: any, columnKey: string, value: any) => {
        if (columnKey === 'plate_number') {
            return item.vehicle?.plate_number || 'Unknown Vehicle'; // Changed from 'vehicles'
        }
        if (columnKey === 'item_name') {
            return item.inventory_item?.name || 'Unknown Item'; // Changed from 'inventory'
        }
        if (columnKey === 'service_type') {
            return <Badge variant="outline" className="capitalize">{value}</Badge>;
        }
        if (columnKey === 'service_date') {
            return new Date(value).toLocaleDateString();
        }
        if (columnKey === 'mileage' && !value) {
            return <span className="text-muted-foreground">-</span>;
        }
        if (columnKey === 'created_by_name') {
            return item.user?.name || 'Unknown User'; // Changed from 'users'
        }
        return String(value || '');
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <PageHeader 
                title="Customer & Vehicle History" 
                description="Manage customers, vehicles, and tire service history."
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="customers">Customers</TabsTrigger>
                    <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
                    <TabsTrigger value="history">Tire History</TabsTrigger>
                </TabsList>

                <TabsContent value="customers" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Customer Management</h3>
                        <Button size="sm" onClick={handleOpenCustomerDialog} disabled={isCustomerLoading}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Customer
                        </Button>
                    </div>

                    {customerError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{customerError}</AlertDescription>
                        </Alert>
                    )}

                    {(isCustomerLoading && customers.length === 0) ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <DataTableWrapper
                            title="Customers"
                            columns={customerColumns}
                            data={customers.map(customer => ({ ...customer, id: customer.customer_id }))}
                            onAddNew={handleOpenCustomerDialog}
                            onEdit={handleEditCustomer}
                            onDelete={(item) => handleDeleteItem(item, 'customer')}
                            renderCell={renderCustomerCell}
                        />
                    )}
                </TabsContent>

                <TabsContent value="vehicles" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Vehicle Management</h3>
                        <Button size="sm" onClick={handleOpenVehicleDialog} disabled={isVehicleLoading}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add Vehicle
                        </Button>
                    </div>

                    {vehicleError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{vehicleError}</AlertDescription>
                        </Alert>
                    )}

                    {(isVehicleLoading && vehicles.length === 0) ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <DataTableWrapper
                            title="Vehicles"
                            columns={vehicleColumns}
                            data={vehicles.map(vehicle => ({ ...vehicle, id: vehicle.vehicle_id }))}
                            onAddNew={handleOpenVehicleDialog}
                            onEdit={handleEditVehicle}
                            onDelete={(item) => handleDeleteItem(item, 'vehicle')}
                            renderCell={renderVehicleCell}
                        />
                    )}
                </TabsContent>

                <TabsContent value="history" className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Tire Service History</h3>
                        <Button size="sm" onClick={handleOpenHistoryDialog} disabled={isHistoryLoading}>
                            <PlusCircle className="mr-2 h-4 w-4" />
                            Add History
                        </Button>
                    </div>

                    {historyError && (
                        <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{historyError}</AlertDescription>
                        </Alert>
                    )}

                    {(isHistoryLoading && tireHistory.length === 0) ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <DataTableWrapper
                            title="Tire History"
                            columns={historyColumns}
                            data={tireHistory.map(history => ({ ...history, id: history.history_id }))}
                            onAddNew={handleOpenHistoryDialog}
                            onEdit={handleEditHistory}
                            onDelete={(item) => handleDeleteItem(item, 'history')}
                            renderCell={renderHistoryCell}
                        />
                    )}
                </TabsContent>
            </Tabs>

            {/* Customer Dialog */}
            <Dialog open={isCustomerDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setIsCustomerDialogOpen(false);
                    resetCustomerForm();
                }
            }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add New Customer'}</DialogTitle>
                        <DialogDescription>
                            {editingCustomer ? `Update details for ${editingCustomer.name}.` : 'Enter the details for the new customer.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer-name">Customer Name *</Label>
                            <Input 
                                id="customer-name" 
                                value={customerName} 
                                onChange={(e) => setCustomerName(e.target.value)} 
                                placeholder="John Doe"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="customer-phone">Phone</Label>
                                <Input 
                                    id="customer-phone" 
                                    value={customerPhone} 
                                    onChange={(e) => setCustomerPhone(e.target.value)} 
                                    placeholder="+1-555-0101"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customer-email">Email</Label>
                                <Input 
                                    id="customer-email" 
                                    type="email"
                                    value={customerEmail} 
                                    onChange={(e) => setCustomerEmail(e.target.value)} 
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="customer-address">Address</Label>
                            <Textarea 
                                id="customer-address" 
                                value={customerAddress} 
                                onChange={(e) => setCustomerAddress(e.target.value)} 
                                placeholder="123 Main Street, City, State"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSubmitCustomer} disabled={isCustomerLoading}>
                            {isCustomerLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingCustomer ? 'Save Changes' : 'Create Customer'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Vehicle Dialog */}
            <Dialog open={isVehicleDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setIsVehicleDialogOpen(false);
                    resetVehicleForm();
                }
            }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}</DialogTitle>
                        <DialogDescription>
                            {editingVehicle ? `Update details for ${editingVehicle.plate_number}.` : 'Enter the details for the new vehicle.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="customer">Customer *</Label>
                            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(customer => (
                                        <SelectItem key={customer.customer_id} value={customer.customer_id}>
                                            {customer.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="plate-number">Plate Number *</Label>
                            <Input 
                                id="plate-number" 
                                value={plateNumber} 
                                onChange={(e) => setPlateNumber(e.target.value)} 
                                placeholder="ABC-1234"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="make">Make</Label>
                                <Input 
                                    id="make" 
                                    value={make} 
                                    onChange={(e) => setMake(e.target.value)} 
                                    placeholder="Toyota"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="model">Model</Label>
                                <Input 
                                    id="model" 
                                    value={model} 
                                    onChange={(e) => setModel(e.target.value)} 
                                    placeholder="Camry"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="year">Year</Label>
                                <Input 
                                    id="year" 
                                    type="number"
                                    value={year} 
                                    onChange={(e) => setYear(e.target.value)} 
                                    placeholder="2020"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="color">Color</Label>
                                <Input 
                                    id="color" 
                                    value={color} 
                                    onChange={(e) => setColor(e.target.value)} 
                                    placeholder="White"
                                />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSubmitVehicle} disabled={isVehicleLoading}>
                            {isVehicleLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingVehicle ? 'Save Changes' : 'Create Vehicle'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={isHistoryDialogOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setIsHistoryDialogOpen(false);
                    resetHistoryForm();
                }
            }}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editingHistory ? 'Edit Tire History' : 'Add Tire History'}</DialogTitle>
                        <DialogDescription>
                            {editingHistory ? `Update tire service record.` : 'Record a new tire service for a vehicle.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="vehicle">Vehicle *</Label>
                            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select vehicle" />
                                </SelectTrigger>
                                <SelectContent>
                                    {vehicles.map(vehicle => (
                                        <SelectItem key={vehicle.vehicle_id} value={vehicle.vehicle_id}>
                                            {vehicle.plate_number} - {vehicle.customer?.name || 'Unknown Customer'}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="item">Tire/Item *</Label>
                            <Select value={selectedItem} onValueChange={setSelectedItem}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select tire/item" />
                                </SelectTrigger>
                                <SelectContent>
                                    {inventory.map(item => (
                                        <SelectItem key={item.item_id} value={item.item_id}>
                                            {item.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="service-type">Service Type *</Label>
                            <Select value={serviceType} onValueChange={(value: any) => setServiceType(value)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="repair">Repair</SelectItem>
                                    <SelectItem value="replacement">Replacement</SelectItem>
                                    <SelectItem value="rotation">Rotation</SelectItem>
                                    <SelectItem value="balancing">Balancing</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="service-date">Service Date *</Label>
                                <Input 
                                    id="service-date" 
                                    type="date"
                                    value={serviceDate} 
                                    onChange={(e) => setServiceDate(e.target.value)} 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mileage">Mileage</Label>
                                <Input 
                                    id="mileage" 
                                    type="number"
                                    value={mileage} 
                                    onChange={(e) => setMileage(e.target.value)} 
                                    placeholder="50000"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="history-notes">Notes</Label>
                            <Textarea 
                                id="history-notes" 
                                value={historyNotes} 
                                onChange={(e) => setHistoryNotes(e.target.value)} 
                                placeholder="Additional notes about the service..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button onClick={handleSubmitHistory} disabled={isHistoryLoading}>
                            {isHistoryLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingHistory ? 'Save Changes' : 'Create History'}
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
