"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, ShoppingCart, Search, XCircle, Car, Bike, Truck, Package, Filter } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { InventoryItem } from '../inventory/page';
import { useAuth } from '@/hooks/useAuth';
import { Badge } from '@/components/ui/badge';

interface Customer {
    customer_id: string;
    name: string;
}

interface CartItem extends InventoryItem {
    quantity: number;
}

const ANONYMOUS_CUSTOMER_ID = "anonymous_customer";

export default function POSPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>(ANONYMOUS_CUSTOMER_ID);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedVehicleType, setSelectedVehicleType] = useState<string>('all');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Vehicle type configuration
    const vehicleTypes = [
        { value: 'all', label: 'All Vehicles', icon: Package, color: 'bg-gray-500' },
        { value: 'car', label: 'Car', icon: Car, color: 'bg-blue-500' },
        { value: 'motor', label: 'Motor', icon: Bike, color: 'bg-green-500' },
        { value: 'truck', label: 'Truck', icon: Truck, color: 'bg-orange-500' }
    ];

    // Categories
    const categories = [
        { value: 'all', label: 'All Categories' },
        { value: 'tire', label: 'Tires' },
        { value: 'tool', label: 'Tools' },
        { value: 'accessory', label: 'Accessories' }
    ];

    const fetchInitialData = useCallback(async () => {
        if (!supabase) {
            setFetchError("Supabase client not available. Please check your .env.local file.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setFetchError(null);
        try {
            const [inventoryRes, customersRes] = await Promise.all([
                supabase.from('inventory_item').select('*').gt('stock_quantity', 0),
                supabase.from('customer').select('customer_id, name')
            ]);

            if (inventoryRes.error) throw inventoryRes.error;
            if (customersRes.error) throw customersRes.error;

            setInventory(inventoryRes.data);
            setCustomers(customersRes.data);
        } catch (error: any) {
            let errorMessage = `Failed to load data: ${error.message}.`;
            setFetchError(errorMessage);
            toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // Filter inventory based on selections
    const filteredInventory = useMemo(() => {
        return inventory.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                item.category.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesVehicle = selectedVehicleType === 'all' || item.vehicle_type === selectedVehicleType;
            const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
            
            return matchesSearch && matchesVehicle && matchesCategory;
        });
    }, [inventory, searchTerm, selectedVehicleType, selectedCategory]);

    const addToCart = (item: InventoryItem) => {
        setCart(prevCart => {
            const existingItem = prevCart.find(cartItem => cartItem.item_id === item.item_id);
            if (existingItem) {
                if (existingItem.quantity < item.stock_quantity) {
                    return prevCart.map(cartItem =>
                        cartItem.item_id === item.item_id ? { ...cartItem, quantity: cartItem.quantity + 1 } : cartItem
                    );
                } else {
                    toast({ title: 'Stock Limit', description: `Cannot add more of ${item.name}. Stock limit reached.`, variant: 'destructive'});
                    return prevCart;
                }
            }
            if (item.stock_quantity > 0) {
              return [...prevCart, { ...item, quantity: 1 }];
            } else {
              toast({ title: 'Out of Stock', description: `${item.name} is out of stock.`, variant: 'destructive'});
              return prevCart;
            }
        });
    };

    const updateQuantity = (itemId: string, newQuantity: number) => {
        const item = inventory.find(p => p.item_id === itemId);
        if (!item) return;

        if (newQuantity > 0 && newQuantity <= item.stock_quantity) {
            setCart(cart.map(cartItem => cartItem.item_id === itemId ? { ...cartItem, quantity: newQuantity } : cartItem));
        } else if (newQuantity > item.stock_quantity) {
            toast({ title: 'Stock Limit', description: `Only ${item.stock_quantity} units of ${item.name} available.`, variant: 'destructive' });
        } else if (newQuantity <= 0) {
            removeFromCart(itemId);
        }
    };
    
    const removeFromCart = (itemId: string) => {
        setCart(cart.filter(item => item.item_id !== itemId));
    };

    const subtotal = cart.reduce((acc, item) => acc + item.sale_price * item.quantity, 0);
    const total = subtotal;

    const handleCheckout = async () => {
        if (!supabase || !authUser) return;
        if (cart.length === 0) {
            toast({ title: 'Empty Cart', description: 'Cannot process an empty cart.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            // Simulate checkout process
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            toast({ title: 'Success', description: 'Sale processed successfully!' });
            setCart([]);
            setSelectedCustomerId(ANONYMOUS_CUSTOMER_ID);
            setSearchTerm('');
            setSelectedVehicleType('all');
            setSelectedCategory('all');
            
            fetchInitialData();
        } catch (error: any) {
            toast({ title: 'Checkout Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const clearFilters = () => {
        setSelectedVehicleType('all');
        setSelectedCategory('all');
        setSearchTerm('');
    };

    if (fetchError) {
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <PageHeader title="Point of Sale (POS)" description="Create new sales transactions for products." />
                <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Database Error</AlertTitle>
                    <AlertDescription>
                        {fetchError}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <PageHeader 
                    title="Auto Parts Kiosk" 
                    description="Quick and easy parts selection for your vehicle"
                    className="text-center mb-8"
                />

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
                    {/* Product Selection - Kiosk Style */}
                    <div className="lg:col-span-2">
                        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
                            <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-t-lg pb-4">
                                <CardTitle className="flex items-center justify-between">
                                    <span className="text-2xl font-bold">Select Your Parts</span>
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-5 w-5" />
                                        <span className="text-sm font-normal">Filters</span>
                                    </div>
                                </CardTitle>
                                
                                {/* Vehicle Type Selection - Kiosk Style */}
                                <div className="space-y-4 mt-4">
                                    <div>
                                        <Label className="text-white text-sm font-medium mb-2 block">Step 1: Choose Vehicle Type</Label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            {vehicleTypes.map((vehicle) => {
                                                const Icon = vehicle.icon;
                                                const isSelected = selectedVehicleType === vehicle.value;
                                                return (
                                                    <Button
                                                        key={vehicle.value}
                                                        variant={isSelected ? "default" : "outline"}
                                                        className={`h-16 flex flex-col gap-1 border-2 transition-all duration-300 ${
                                                            isSelected 
                                                                ? 'bg-white text-blue-600 border-white shadow-lg scale-105' 
                                                                : 'bg-white/20 text-white border-white/30 hover:bg-white/30 hover:scale-105'
                                                        }`}
                                                        onClick={() => setSelectedVehicleType(vehicle.value)}
                                                    >
                                                        <Icon className="h-5 w-5" />
                                                        <span className="text-xs font-medium">{vehicle.label}</span>
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Category Selection */}
                                    <div>
                                        <Label className="text-white text-sm font-medium mb-2 block">Step 2: Choose Category</Label>
                                        <div className="flex flex-wrap gap-2">
                                            {categories.map((category) => {
                                                const isSelected = selectedCategory === category.value;
                                                return (
                                                    <Button
                                                        key={category.value}
                                                        variant={isSelected ? "secondary" : "outline"}
                                                        className={`transition-all duration-300 ${
                                                            isSelected 
                                                                ? 'bg-white text-blue-600 shadow-lg scale-105' 
                                                                : 'bg-white/20 text-white border-white/30 hover:bg-white/30 hover:scale-105'
                                                        }`}
                                                        onClick={() => setSelectedCategory(category.value)}
                                                    >
                                                        {category.label}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Search Bar */}
                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white h-4 w-4" />
                                        <Input 
                                            placeholder="Search parts by name..." 
                                            className="pl-10 bg-white/20 border-white/30 text-white placeholder:text-white/70 focus:bg-white focus:text-slate-900 transition-all duration-300"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        {(selectedVehicleType !== 'all' || selectedCategory !== 'all' || searchTerm) && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white hover:text-white hover:bg-white/20"
                                                onClick={clearFilters}
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-6">
                                {/* Active Filters Display */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {selectedVehicleType !== 'all' && (
                                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                                            Vehicle: {vehicleTypes.find(v => v.value === selectedVehicleType)?.label}
                                        </Badge>
                                    )}
                                    {selectedCategory !== 'all' && (
                                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                                            Category: {categories.find(c => c.value === selectedCategory)?.label}
                                        </Badge>
                                    )}
                                    {searchTerm && (
                                        <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                                            Search: {searchTerm}
                                        </Badge>
                                    )}
                                </div>

                                {/* Product Grid */}
                                {isLoading ? (
                                    <div className="flex justify-center items-center h-48">
                                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto pr-2">
                                        {filteredInventory.map(item => (
                                            <Card 
                                                key={item.item_id} 
                                                className="flex flex-col justify-between border-2 border-slate-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                                                onClick={() => addToCart(item)}
                                            >
                                                <CardContent className="p-4 flex flex-col gap-3">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{item.name}</p>
                                                            <div className="flex gap-2 mt-1">
                                                                <Badge variant="outline" className="text-xs capitalize">
                                                                    {item.category}
                                                                </Badge>
                                                                <Badge 
                                                                    variant="outline" 
                                                                    className={`text-xs ${
                                                                        item.vehicle_type === 'car' ? 'bg-blue-100 text-blue-700' :
                                                                        item.vehicle_type === 'motor' ? 'bg-green-100 text-green-700' :
                                                                        'bg-orange-100 text-orange-700'
                                                                    }`}
                                                                >
                                                                    {item.vehicle_type}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-lg font-bold text-green-600">₱{item.sale_price.toFixed(2)}</p>
                                                            <p className={`text-xs ${
                                                                item.stock_quantity <= 2 ? 'text-red-500' :
                                                                item.stock_quantity <= 5 ? 'text-orange-500' : 'text-green-500'
                                                            }`}>
                                                                {item.stock_quantity} in stock
                                                            </p>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                                <CardFooter className="p-3 bg-slate-50 group-hover:bg-blue-50 transition-colors">
                                                    <Button 
                                                        size="sm" 
                                                        className="w-full bg-blue-600 hover:bg-blue-700 transition-colors"
                                                        disabled={item.stock_quantity <= 0}
                                                    >
                                                        <Plus className="mr-2 h-4 w-4" /> 
                                                        Add to Cart
                                                    </Button>
                                                </CardFooter>
                                            </Card>
                                        ))}
                                        {filteredInventory.length === 0 && (
                                            <div className="col-span-full text-center py-12">
                                                <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                                                <p className="text-slate-500 text-lg">No parts found</p>
                                                <p className="text-slate-400 text-sm">Try adjusting your filters or search term</p>
                                                <Button 
                                                    variant="outline" 
                                                    className="mt-4"
                                                    onClick={clearFilters}
                                                >
                                                    Clear All Filters
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Cart & Checkout - Right Side */}
                    <div className="lg:col-span-1">
                        <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm sticky top-8">
                            <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
                                <CardTitle className="flex items-center">
                                    <ShoppingCart className="mr-2 h-6 w-6" /> 
                                    Your Order
                                    {cart.length > 0 && (
                                        <Badge variant="secondary" className="ml-2 bg-white text-green-600">
                                            {cart.length} items
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                {/* Customer Selection */}
                                <div className="space-y-3">
                                    <Label htmlFor="customer-select" className="text-slate-700 font-medium">Customer</Label>
                                    <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId}>
                                        <SelectTrigger id="customer-select" className="border-slate-300">
                                            <SelectValue placeholder="Select a customer" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={ANONYMOUS_CUSTOMER_ID}>Walk-in Customer</SelectItem>
                                            {customers.map(c => (
                                                <SelectItem key={c.customer_id} value={c.customer_id}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Cart Items */}
                                <div className="space-y-4">
                                    <Label className="text-slate-700 font-medium">Order Items</Label>
                                    <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                                        {cart.length === 0 ? (
                                            <div className="text-center py-8">
                                                <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                                <p className="text-slate-500">Your cart is empty</p>
                                                <p className="text-slate-400 text-sm">Add parts from the left</p>
                                            </div>
                                        ) : (
                                            cart.map(item => (
                                                <div key={item.item_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                                                        <p className="text-xs text-slate-500">₱{item.sale_price.toFixed(2)} each</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                                                        >
                                                            -
                                                        </Button>
                                                        <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
                                                            disabled={item.quantity >= item.stock_quantity}
                                                        >
                                                            +
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                            onClick={() => removeFromCart(item.item_id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>

                                {/* Order Summary */}
                                {cart.length > 0 && (
                                    <div className="border-t pt-4 space-y-3">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Subtotal</span>
                                            <span className="font-medium">₱{subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-bold">
                                            <span className="text-slate-800">Total Amount</span>
                                            <span className="text-green-600">₱{total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-col gap-3 p-6 bg-slate-50 rounded-b-lg">
                                <Button 
                                    className="w-full h-12 text-lg font-bold bg-green-600 hover:bg-green-700 transition-colors shadow-lg" 
                                    onClick={handleCheckout} 
                                    disabled={cart.length === 0 || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    ) : (
                                        <ShoppingCart className="mr-2 h-5 w-5" />
                                    )}
                                    Process Order
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full border-slate-300 text-slate-600 hover:bg-slate-100" 
                                    onClick={() => setCart([])} 
                                    disabled={cart.length === 0}
                                >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Clear Cart
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}