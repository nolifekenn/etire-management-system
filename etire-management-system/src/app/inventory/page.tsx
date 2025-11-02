
"use client";

import { useState, useEffect, useCallback } from 'react';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/PageHeader';
import { DataTableWrapper } from '@/components/DataTableWrapper';
import { Archive, Coins, AlertTriangle, PlusCircle, PackageSearch, Loader2, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { supabase } from '@/lib/supabaseClient';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

// Interface based on the user's 'inventory' table schema
export interface InventoryItem {
  item_id: string;
  name: string;
  category: 'tire' | 'tool' | 'accessory';
  stock_quantity: number;
  cost_price: number;
  sale_price: number;
  created_at?: string;
  updated_at?: string;
}

const columns = [
  { key: 'name', header: 'Product Name' },
  { key: 'category', header: 'Category' },
  { key: 'stock_quantity', header: 'Stock' },
  { key: 'sale_price', header: 'Selling Price (₱)' },
];

export default function InventoryPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'tire' | 'tool' | 'accessory'>('all');

  // Form state for Add/Edit dialog
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState<InventoryItem['category']>('tire');
  const [itemCostPrice, setItemCostPrice] = useState('');
  const [itemSalePrice, setItemSalePrice] = useState('');
  const [itemStockQuantity, setItemStockQuantity] = useState('0');

  const fetchProducts = useCallback(async () => {
    if (!supabase) {
      setFetchError("Supabase client is not available. Please check your environment variables.");
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    const { data, error } = await supabase
      .from('inventory_item')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching inventory:', error.message);
      setFetchError(`Could not fetch inventory: ${error.message}. This could be due to missing database tables or Row Level Security (RLS) being enabled without any policies.`);
      setItems([]);
    } else {
      setItems(data as InventoryItem[]);
      setFetchError(null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const resetForm = () => {
    setItemName('');
    setItemCategory('tire');
    setItemCostPrice('');
    setItemSalePrice('');
    setItemStockQuantity('0');
  };

  const populateForm = (product: InventoryItem) => {
    setItemName(product.name);
    setItemCategory(product.category);
    setItemCostPrice(String(product.cost_price));
    setItemSalePrice(String(product.sale_price));
    setItemStockQuantity(String(product.stock_quantity));
  };

  useEffect(() => {
    if (editingItem) {
      populateForm(editingItem);
    } else {
      resetForm();
    }
  }, [editingItem]);

  const handleOpenAddDialog = () => {
    resetForm();
    setEditingItem(null);
    setIsAddItemDialogOpen(true);
  }

  const handleOpenEditDialog = (item: InventoryItem) => {
    setEditingItem(item);
    setIsEditItemDialogOpen(true);
  };
  
  const handleOpenDeleteDialog = (item: InventoryItem) => {
    setDeletingItem(item);
    setIsDeleteConfirmationOpen(true);
  };

  const handleSubmit = async () => {
    if (!supabase) return;
    if (!itemName || !itemCostPrice || !itemSalePrice) { 
      toast({ title: "Validation Error", description: "Name, Cost Price, and Sale Price are required.", variant: "destructive" });
      return;
    }
    
    const itemData = {
      name: itemName,
      category: itemCategory,
      cost_price: parseFloat(itemCostPrice),
      sale_price: parseFloat(itemSalePrice),
      stock_quantity: parseInt(itemStockQuantity, 10),
    };

    setIsLoading(true);

    let error;
    if (editingItem) {
        // Update
        const { error: updateError } = await supabase.from('inventory_item').update(itemData).eq('item_id', editingItem.item_id);
        error = updateError;
    } else {
        // Insert
        const { error: insertError } = await supabase.from('inventory_item').insert([itemData]);
        error = insertError;
    }

    setIsLoading(false);

    if (error) {
      console.error('Error saving item:', error);
      toast({ title: "Save Error", description: `Could not save item: ${error.message}`, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `Item ${editingItem ? 'updated' : 'saved'} successfully.` });
      setIsAddItemDialogOpen(false);
      setIsEditItemDialogOpen(false);
      setEditingItem(null);
      fetchProducts();
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem || !supabase) return;
    setIsLoading(true);
    const { error } = await supabase
      .from('inventory_item')
      .delete()
      .eq('item_id', deletingItem.item_id);
    setIsLoading(false);

    if (error) {
      console.error('Error deleting item:', error);
      toast({ title: "Delete Error", description: `Could not delete item: ${error.message}`, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Item deleted successfully." });
      setIsDeleteConfirmationOpen(false);
      setDeletingItem(null);
      fetchProducts();
    }
  };

  // Filter items based on category
  const filteredItems = categoryFilter === 'all' 
    ? items 
    : items.filter(item => item.category === categoryFilter);

  const totalStockValue = filteredItems.reduce((acc, p) => acc + (p.sale_price * p.stock_quantity), 0);
  const lowStockCount = filteredItems.filter(p => p.stock_quantity <= 5).length;
  const outOfStockCount = filteredItems.filter(p => p.stock_quantity === 0).length;

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <PageHeader 
        title="Inventory Management" 
        description="Track all products, stock levels, and pricing."
      >
        <div className="flex items-center gap-2">
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as typeof categoryFilter)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="tire">Tires</SelectItem>
              <SelectItem value="tool">Tools</SelectItem>
              <SelectItem value="accessory">Accessories</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {fetchError && (
          <Alert variant="destructive" className="mb-8">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Database Connection Error</AlertTitle>
              <AlertDescription>
                  {fetchError}
                  <p className="mt-2">This may be due to one of the following:</p>
                  <ul className="list-disc pl-5 mt-1">
                      <li>Incorrect Supabase URL or anon key in your `.env.local` file.</li>
                      <li>Row Level Security (RLS) is enabled on the `inventory` table without a policy to allow read access.</li>
                      <li>The required tables do not exist in the database. You may need to run the schema script.</li>
                  </ul>
                  <p className="mt-2">Please check your Supabase project settings and RLS policies.</p>
              </AlertDescription>
          </Alert>
      )}
      
      <Dialog open={isAddItemDialogOpen || isEditItemDialogOpen} onOpenChange={(isOpen) => {
          if (isLoading) return;
          if (!isOpen) {
            setIsAddItemDialogOpen(false);
            setIsEditItemDialogOpen(false);
            setEditingItem(null);
          }
      }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription>
              {editingItem ? `Update details for ${editingItem.name}.` : 'Enter the details for the new item.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            <div className="col-span-1 md:col-span-2 space-y-2">
              <Label htmlFor="itemName">Item Name</Label>
              <Input id="itemName" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="Michelin Tire XZ" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemCategory">Category</Label>
              <Select value={itemCategory} onValueChange={(v) => setItemCategory(v as InventoryItem['category'])}>
                <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tire">Tire</SelectItem>
                  <SelectItem value="tool">Tool</SelectItem>
                  <SelectItem value="accessory">Accessory</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemStockQuantity">Stock Quantity</Label>
              <Input id="itemStockQuantity" type="number" value={itemStockQuantity} onChange={(e) => setItemStockQuantity(e.target.value)} placeholder="10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemCostPrice">Cost Price</Label>
              <Input id="itemCostPrice" type="number" value={itemCostPrice} onChange={(e) => setItemCostPrice(e.target.value)} placeholder="5000.00" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemSalePrice">Sale Price</Label>
              <Input id="itemSalePrice" type="number" value={itemSalePrice} onChange={(e) => setItemSalePrice(e.target.value)} placeholder="7500.00" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={isLoading}>Cancel</Button></DialogClose>
            <Button type="submit" onClick={handleSubmit} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {editingItem ? 'Save Changes' : 'Save Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingItem?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteItem} disabled={isLoading} className="bg-destructive hover:bg-destructive/90">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Total Items" value={isLoading ? "..." : String(filteredItems.length)} icon={Archive} description="Distinct item types" iconClassName="text-blue-500" />
        <StatCard title="Total Stock Value" value={isLoading ? "..." : `₱${totalStockValue.toLocaleString()}`} icon={Coins} description="Based on sale price" iconClassName="text-green-500" />
        <StatCard title="Low Stock Alerts" value={isLoading ? "..." : String(lowStockCount)} icon={AlertTriangle} description="Needs reordering" iconClassName="text-yellow-500" />
        <StatCard title="Out of Stock" value={isLoading ? "..." : String(outOfStockCount)} icon={PackageSearch} description="Urgently require attention" iconClassName="text-red-500" />
      </div>

      {(isLoading && items.length === 0 && !fetchError) ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
      <DataTableWrapper
        title="Inventory List"
        columns={columns}
        data={filteredItems.map(i => ({...i, id: i.item_id}))}
        onAddNew={handleOpenAddDialog}
        onEdit={handleOpenEditDialog}
        onDelete={handleOpenDeleteDialog}
        renderCell={(item, columnKey, value) => {
          if (columnKey === 'sale_price') {
            return `₱${Number(value).toFixed(2)}`;
          }
          if (columnKey === 'category') {
            return <Badge variant={'outline'} className="capitalize">{String(value)}</Badge>;
          }
          if (columnKey === 'stock_quantity') {
             const stock = Number(value);
             const isLow = stock <= 5;
             const isOut = stock === 0;
             return <Badge variant={isOut ? 'destructive' : isLow ? 'secondary' : 'outline'} className={
                isOut ? 'bg-red-100 text-red-700' :
                isLow ? 'bg-yellow-100 text-yellow-700' : ''
             }>{String(value)}</Badge>
          }
          return String(value);
        }}
      />
      )}
    </div>
  );
}