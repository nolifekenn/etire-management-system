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
import { Loader2, Plus, Trash2, ShoppingCart, Search, XCircle, Car, Bike, Truck, Package, Filter, RefreshCw, Clock } from 'lucide-react';
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

// Design system from inventory page
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
    const [mounted, setMounted] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    // Vehicle type configuration
    const vehicleTypes = [
        { value: 'all', label: 'All Vehicles', icon: Package, color: 'bg-slate-500' },
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

    useEffect(() => {
        setMounted(true);
    }, []);

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
            setLastUpdated(new Date());
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
            <div className="min-h-screen bg-white text-slate-800 font-poppins relative overflow-hidden">
                <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">
                    <PageHeader title="Point of Sale (POS)" description="Create new sales transactions for products." />
                    <Alert variant="destructive" className="mt-4">
                        <AlertTitle>Database Error</AlertTitle>
                        <AlertDescription>
                            {fetchError}
                        </AlertDescription>
                    </Alert>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white text-slate-800 font-poppins relative overflow-hidden">
            
            {/* Background Sections - Same as inventory page */}
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
                <div className="absolute top-0 right-0 w-32 h-32 bg-teal-300/20 rounded-bl-full"></div>
            </div>

            <div className="absolute top-64 left-0 w-full h-full bg-indigo-50/10">
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-indigo-100/15 to-indigo-50/10"></div>
            </div>

            <div className="container mx-auto p-6 sm:p-8 lg:p-10 relative z-10">
                
                {/* Header Section - Same style as inventory page */}
                <div className={`mb-8 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
                    <div className="bg-white/20 backdrop-blur-md rounded-2xl border border-white/30 p-6 flex items-center justify-between shadow-xl relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-black/10 rounded-2xl"></div>
                        
                        <div className="relative z-10 flex-1">
                            <h1 className="text-3xl font-bold text-white mb-2 drop-shadow-2xl font-poppins tracking-tight">
                                Point of Sale (POS)
                            </h1>
                            <div className="flex items-center gap-6 text-white/90">
                                <p className="flex items-center gap-3 drop-shadow-md text-lg font-medium">
                                    <ShoppingCart className="h-5 w-5 opacity-90" />
                                    Quick and easy sales transactions
                                </p>
                                <div className="flex items-center gap-4">
                                    {lastUpdated && (
                                        <div className="flex items-center gap-2 text-white/90 bg-black/30 px-3 py-1 rounded-full backdrop-blur-sm text-sm">
                                            <Clock className="w-4 h-4" />
                                            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2 text-green-300 bg-green-900/40 px-3 py-1 rounded-full backdrop-blur-sm text-sm">
                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                        Live data
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <Button 
                            onClick={fetchInitialData}
                            disabled={isLoading}
                            className={buttonStyles.glass + " active:scale-95 text-sm"}
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Product Selection - Left Side */}
                    <div className="lg:col-span-2">
                        <Card className="bg-white border-slate-200 shadow-lg transition-all duration-300 hover:shadow-xl">
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center justify-between">
                                    <span>Available Products</span>
                                    <div className="flex items-center gap-2">
                                        <Filter className="h-4 w-4" />
                                        <span className="text-sm font-normal">Quick Filters</span>
                                    </div>
                                </CardTitle>
                                
                                {/* Kiosk Style Filtering */}
                                <div className="space-y-4 mt-4">
                                    {/* Vehicle Type Selection */}
                                    <div>
                                        <Label className="text-slate-700 text-sm font-medium mb-3 block">Vehicle Type</Label>
                                        <div className="grid grid-cols-4 gap-2 w-full">
                                            {vehicleTypes.map((vehicle) => {
                                                const Icon = vehicle.icon;
                                                const isSelected = selectedVehicleType === vehicle.value;
                                                return (
                                                    <Button
                                                        key={vehicle.value}
                                                        variant={isSelected ? "default" : "outline"}
                                                        className={`flex items-center justify-center gap-2 transition-all duration-300 w-full ${
                                                            isSelected 
                                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md transform scale-105' 
                                                                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 hover:border-indigo-400 hover:scale-105'
                                                        }`}
                                                        onClick={() => setSelectedVehicleType(vehicle.value)}
                                                    >
                                                        <Icon className="h-4 w-4" />
                                                        {vehicle.label}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Category Selection */}
                                    <div>
                                        <Label className="text-slate-700 text-sm font-medium mb-3 block">Category</Label>
                                        <div className="grid grid-cols-4 gap-2 w-full">
                                            {categories.map((category) => {
                                                const isSelected = selectedCategory === category.value;
                                                return (
                                                    <Button
                                                        key={category.value}
                                                        variant={isSelected ? "secondary" : "outline"}
                                                        className={`transition-all duration-300 w-full ${
                                                            isSelected 
                                                                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md transform scale-105' 
                                                                : 'bg-white text-slate-700 hover:bg-slate-50 border-slate-300 hover:border-indigo-400 hover:scale-105'
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
                                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                                        <Input 
                                            placeholder="Search products by name or category..." 
                                            className="pl-10 border-slate-300 focus:border-indigo-400 transition-all duration-300"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                        {(selectedVehicleType !== 'all' || selectedCategory !== 'all' || searchTerm) && (
                                            <button
                                                onClick={clearFilters}
                                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-all duration-300"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Active Filters Display */}
                                <div className="flex flex-wrap gap-2 mt-3">
                                    {selectedVehicleType !== 'all' && (
                                        <Badge variant="outline" className="bg-blue-100 text-blue-700 border-blue-200">
                                            Vehicle: {vehicleTypes.find(v => v.value === selectedVehicleType)?.label}
                                        </Badge>
                                    )}
                                    {selectedCategory !== 'all' && (
                                        <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                                            Category: {categories.find(c => c.value === selectedCategory)?.label}
                                        </Badge>
                                    )}
                                    {searchTerm && (
                                        <Badge variant="outline" className="bg-purple-100 text-purple-700 border-purple-200">
                                            Search: {searchTerm}
                                        </Badge>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                {/* Product Grid */}
                                {isLoading ? (
                                    <div className="flex justify-center items-center h-48">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 p-6 max-h-[60vh] overflow-y-auto">
                                        {filteredInventory.map(item => (
                                            <Card 
                                                key={item.item_id} 
                                                className={`border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer group ${microAnimations.cardHover}`}
                                                onClick={() => addToCart(item)}
                                            >
                                                <CardContent className="p-4 flex flex-col gap-3">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <p className="font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                                                                {item.name}
                                                            </p>
                                                            <div className="flex gap-2 mt-2">
                                                                <Badge variant="outline" className="text-xs capitalize bg-slate-100 text-slate-700 border-slate-300">
                                                                    {item.category}
                                                                </Badge>
                                                                <Badge 
                                                                    variant="outline" 
                                                                    className={`text-xs ${
                                                                        item.vehicle_type === 'car' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                                                        item.vehicle_type === 'motor' ? 'bg-green-100 text-green-700 border-green-200' :
                                                                        'bg-orange-100 text-orange-700 border-orange-200'
                                                                    }`}
                                                                >
                                                                    {item.vehicle_type}
                                                                </Badge>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <div>
                                                            <p className="text-lg font-bold text-green-600">₱{item.sale_price.toFixed(2)}</p>
                                                            <p className={`text-xs ${
                                                                item.stock_quantity === 0 ? 'text-red-500' :
                                                                item.stock_quantity <= 2 ? 'text-red-500' :
                                                                item.stock_quantity <= 5 ? 'text-yellow-500' : 'text-green-500'
                                                            }`}>
                                                                {item.stock_quantity} in stock
                                                            </p>
                                                        </div>
                                                        <Button 
                                                            size="sm" 
                                                            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300"
                                                            disabled={item.stock_quantity <= 0}
                                                        >
                                                            <Plus className="mr-1 h-4 w-4" /> 
                                                            Add
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                        {filteredInventory.length === 0 && (
                                            <div className="col-span-full text-center py-12">
                                                <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                                                <p className="text-slate-500 text-lg">No products found</p>
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
                        <Card className="bg-white border-slate-200 shadow-lg transition-all duration-300 hover:shadow-xl sticky top-8">
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <ShoppingCart className="mr-2 h-5 w-5" /> 
                                    Shopping Cart
                                    {cart.length > 0 && (
                                        <Badge variant="outline" className="ml-2 bg-indigo-100 text-indigo-700 border-indigo-200">
                                            {cart.length} items
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Customer Selection */}
                                <div className="space-y-2">
                                    <Label htmlFor="customer-select" className="text-slate-700 font-medium">Customer</Label>
                                    <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId}>
                                        <SelectTrigger id="customer-select" className="border-slate-300 focus:border-indigo-400">
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
                                <div className="space-y-3">
                                    <Label className="text-slate-700 font-medium">Order Items</Label>
                                    <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                                        {cart.length === 0 ? (
                                            <div className="text-center py-8">
                                                <ShoppingCart className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                                                <p className="text-slate-500">Your cart is empty</p>
                                                <p className="text-slate-400 text-sm">Add products to get started</p>
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
                                    <div className="border-t pt-4 space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-slate-600">Subtotal</span>
                                            <span className="font-medium">₱{subtotal.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between font-bold text-lg">
                                            <span className="text-slate-800">Total Amount</span>
                                            <span className="text-green-600">₱{total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter className="flex flex-col gap-3">
                                <Button 
                                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 transition-all duration-300" 
                                    onClick={handleCheckout} 
                                    disabled={cart.length === 0 || isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <ShoppingCart className="mr-2 h-4 w-4" />
                                    )}
                                    Process Sale
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600" 
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