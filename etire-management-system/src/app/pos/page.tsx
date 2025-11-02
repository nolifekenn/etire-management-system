
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, ShoppingCart, Search, XCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import type { InventoryItem } from '../inventory/page';
import { useAuth } from '@/hooks/useAuth';
import { receiptGenerator } from '@/lib/receiptGenerator';

interface Customer {
    customer_id: string; // Changed from user_id to customer_id
    name: string;
}

interface CartItem extends InventoryItem {
    quantity: number;
}

const ANONYMOUS_CUSTOMER_ID = "anonymous_customer";

// 🔄 RECEIPT GENERATION PLACEHOLDER - BACKEND SERVICE NEEDED
// TODO: Implement comprehensive receipt generation system
const generateReceipt = async (saleId: string, saleData: any, cartItems: any[]) => {
    // PLACEHOLDER: This function should be implemented as a backend service
    // Required functionality:
    // 1. Generate PDF receipt with company branding
    // 2. Send email receipt to customer (if email provided)
    // 3. Store receipt data in database
    // 4. Generate unique receipt number
    // 5. Include QR code for verification
    // 6. Handle receipt printing
    
    console.log('🔄 RECEIPT GENERATION PLACEHOLDER');
    console.log('Sale ID:', saleId);
    console.log('Sale Data:', saleData);
    console.log('Cart Items:', cartItems);
    
    // TODO: Implement actual receipt generation
    // - PDF generation using jsPDF or Puppeteer
    // - Email service integration (SendGrid, AWS SES)
    // - Database storage in receipts table
    // - Receipt printing service
    // - QR code generation for verification
    
    // PLACEHOLDER: Simulate receipt generation
    return Promise.resolve({
        receiptId: `RCP-${Date.now()}`,
        receiptUrl: '/receipts/placeholder.pdf',
        emailSent: false,
        printQueued: false
    });
};

export default function POSPage() {
    const { toast } = useToast();
    const { user: authUser } = useAuth(); // The employee making the sale
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>(ANONYMOUS_CUSTOMER_ID);
    const [searchTerm, setSearchTerm] = useState('');
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const fetchInitialData = useCallback(async () => {
        if (!supabase) {
            setFetchError("Supabase client not available. Please check your .env.local file.");
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setFetchError(null);
        try {
            // Fetch customers and inventory in parallel
            const [inventoryRes, customersRes] = await Promise.all([
                supabase.from('inventory_item').select('*').gt('stock_quantity', 0), // Only fetch items in stock
                supabase.from('customer').select('customer_id, name') // Changed from 'user' to 'customer'
            ]);

            if (inventoryRes.error) throw inventoryRes.error;
            if (customersRes.error) throw customersRes.error;

            setInventory(inventoryRes.data);
            setCustomers(customersRes.data);
        } catch (error: any) {
            let errorMessage = `Failed to load data: ${error.message}.`;
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
                errorMessage += ` Make sure the 'inventory_item' and 'customer' tables exist and have been created via the schema script.`;
            }
            setFetchError(errorMessage);
            toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
        } finally {
            setIsLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

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
    const total = subtotal; // Simplified, no discounts or taxes

    const filteredInventory = inventory.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCheckout = async () => {
        if (!supabase || !authUser) return;
        if (cart.length === 0) {
            toast({ title: 'Empty Cart', description: 'Cannot process an empty cart.', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            // Since we don't have a dedicated customer table, and a user can be a customer,
            // we link the sale to the logged-in employee (authUser) who processed it.
            // The 'selectedCustomerId' can be stored in a different field if schema allows, or just for record-keeping.
            const { data: sale, error: saleError } = await supabase
                .from('sale')
                .insert({
                    user_id: authUser.user_id, // The employee who made the sale
                    total_amount: total,
                    // If you had a customer_id field: customer_id: selectedCustomerId === ANONYMOUS_CUSTOMER_ID ? null : selectedCustomerId,
                })
                .select()
                .single();
            if (saleError) throw saleError;

            // Step 2: Create sale_items records
            const saleItems = cart.map(item => ({
                sale_id: sale.sale_id,
                item_id: item.item_id,
                quantity: item.quantity,
                price_at_sale: item.sale_price,
            }));

            const { error: itemsError } = await supabase.from('sale_item').insert(saleItems);
            if (itemsError) {
                // Attempt to roll back the sale if items fail
                await supabase.from('sale').delete().eq('sale_id', sale.sale_id);
                throw itemsError;
            }

            // Database trigger 'on_sale_item_insert_update_stock' handles stock reduction automatically.

            // 🔄 RECEIPT GENERATION - BACKEND SERVICE
            // Generate comprehensive receipt with PDF, email, and database storage
            try {
                const receiptResult = await receiptGenerator.generateCompleteReceipt(
                    sale.sale_id, 
                    { 
                        ...saleData, 
                        customerName: selectedCustomer?.name || 'Walk-in Customer',
                        employeeName: authUser?.name || 'Staff'
                    }, 
                    cart
                );
                console.log('Receipt generated:', receiptResult);
            } catch (receiptError) {
                console.error('Receipt generation failed:', receiptError);
                // Don't fail the sale if receipt generation fails
            }

            toast({ title: 'Success', description: 'Sale processed successfully!' });
            setCart([]);
            setSelectedCustomerId(ANONYMOUS_CUSTOMER_ID);
            setSearchTerm('');
            // Refetch product data to get updated stock counts
            fetchInitialData();

        } catch (error: any) {
            toast({ title: 'Checkout Error', description: error.message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    if (fetchError && fetchError.includes('infinite recursion')) {
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <PageHeader title="Point of Sale (POS)" description="Create new sales transactions for products." />
                <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Database Security Policy Error</AlertTitle>
                    <AlertDescription>
                        {fetchError}
                        <p className="font-bold mt-4">How to fix:</p>
                        <p>Go to your Supabase project's SQL Editor and run the following script to fix the recursive policy on the `users` table. This script will safely remove the old policy if it exists and create a correct one.</p>
                         <pre className="mt-2 p-2 bg-gray-800 text-white rounded-md text-xs whitespace-pre-wrap">
{`-- This script safely replaces a potentially recursive policy on the 'users' table.
DROP POLICY IF EXISTS "Allow all read access on users" ON public.users;

CREATE POLICY "Allow all read access on users"
ON public.users
FOR SELECT
USING (true);`}
                         </pre>
                         <p className="mt-2">After running the script, refresh this page.</p>
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="container mx-auto p-4 sm:p-6 lg:p-8">
                <PageHeader title="Point of Sale (POS)" description="Create new sales transactions for products." />
                <Alert variant="destructive" className="mt-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Database Error</AlertTitle>
                    <AlertDescription>
                        {fetchError}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8">
            <PageHeader title="Point of Sale (POS)" description="Create new sales transactions for products." />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Product Selection */}
                <div className="lg:col-span-2">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle>Inventory Items</CardTitle>
                            <div className="relative mt-2">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input 
                                    placeholder="Search by name or category..." 
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="max-h-[60vh] overflow-y-auto">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin" /></div>
                            ) : (
                                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {filteredInventory.map(item => (
                                        <Card key={item.item_id} className="flex flex-col justify-between">
                                            <CardContent className="p-3">
                                                <p className="font-semibold truncate">{item.name}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{item.category}</p>
                                                <p className="text-sm font-bold">₱{item.sale_price.toFixed(2)}</p>
                                                <p className={`text-xs ${item.stock_quantity <= 5 ? 'text-red-500' : 'text-green-500'}`}>
                                                    Stock: {item.stock_quantity}
                                                </p>
                                            </CardContent>
                                            <CardFooter className="p-2">
                                                 <Button size="sm" className="w-full" onClick={() => addToCart(item)} disabled={item.stock_quantity <= 0}>
                                                    <Plus className="mr-2 h-4 w-4" /> Add
                                                </Button>
                                            </CardFooter>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Cart & Checkout */}
                <div className="lg:col-span-1">
                    <Card className="shadow-lg sticky top-8">
                        <CardHeader>
                            <CardTitle className="flex items-center"><ShoppingCart className="mr-2" /> Cart</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                           <div className="space-y-2">
                                <Label htmlFor="customer-select">Customer</Label>
                                <Select onValueChange={setSelectedCustomerId} value={selectedCustomerId}>
                                    <SelectTrigger id="customer-select">
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
                           <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                               {cart.length === 0 ? (
                                   <p className="text-sm text-muted-foreground text-center py-8">Cart is empty</p>
                               ) : (
                                   cart.map(item => (
                                       <div key={item.item_id} className="flex items-center justify-between">
                                           <div>
                                               <p className="text-sm font-medium">{item.name}</p>
                                               <p className="text-xs text-muted-foreground">₱{item.sale_price.toFixed(2)}</p>
                                           </div>
                                           <div className="flex items-center gap-2">
                                               <Input 
                                                    type="number"
                                                    className="h-8 w-16 text-center"
                                                    value={item.quantity}
                                                    onChange={(e) => updateQuantity(item.item_id, parseInt(e.target.value) || 0)}
                                                    min="0"
                                                    max={item.stock_quantity}
                                                />
                                               <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeFromCart(item.item_id)}>
                                                   <Trash2 className="h-4 w-4" />
                                               </Button>
                                           </div>
                                       </div>
                                   ))
                               )}
                           </div>
                           {cart.length > 0 && (
                                <div className="border-t pt-4 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span>Subtotal</span>
                                        <span>₱{subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between font-bold text-lg">
                                        <span>Total</span>
                                        <span>₱{total.toFixed(2)}</span>
                                    </div>
                                </div>
                           )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-2">
                            <Button className="w-full" size="lg" onClick={handleCheckout} disabled={cart.length === 0 || isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
                                Checkout
                            </Button>
                            <Button variant="outline" className="w-full" onClick={() => setCart([])} disabled={cart.length === 0}>
                                <XCircle className="mr-2 h-4 w-4" />
                                Clear Cart
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    );
}
