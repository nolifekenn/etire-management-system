import { supabaseUntyped as supabase } from "@/lib/supabaseClient";
import { createAdminClient } from "@/lib/supabaseServer";
import { NextResponse } from "next/server";

// Define the type for a cart item
interface CartItem {
  item_id: string;
  quantity: number;
  sale_price: number;
  installationFee?: number;
}

export async function POST(request: Request) {
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const { customerId, cartItems, paymentMethod, userId, branchId } = await request.json();

  if (!userId || !cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: "Missing required sale data." }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  try {
    // 1. Calculate total amount
    const total_amount = cartItems.reduce((acc: number, item: CartItem) => {
      return acc + (item.sale_price * item.quantity) + (item.installationFee || 0);
    }, 0);

    // 2. Create the 'sale' record
    const { data: saleData, error: saleError } = await supabase
      .from('sale')
      .insert({
        user_id: userId,
        customer_id: customerId,
        branch_id: branchId,
        payment_method: paymentMethod,
        total_amount: total_amount,
        discount_amount: 0,
        tax_amount: 0,
      })
      .select()
      .single();

    if (saleError) throw new Error(`Error creating sale: ${saleError.message}`);
    const saleId = saleData.sale_id;

    // 3. Create 'sale_item' records
    const saleItemsToInsert = cartItems.map((item: CartItem) => ({
      sale_id: saleId,
      item_id: item.item_id,
      quantity: item.quantity,
      price_at_sale: item.sale_price,
      installation_fee: item.installationFee || 0,
    }));

    const { error: itemsError } = await supabase.from('sale_item').insert(saleItemsToInsert);

    if (itemsError) {
      // Soft delete rollback
      await supabase.from('sale').update({ deleted_at: new Date().toISOString() }).eq('sale_id', saleId);
      throw new Error(`Error saving sale items: ${itemsError.message}`);
    }

    // 4. Decrement stock_quantity for each sold item using admin client (bypasses RLS)
    const stockErrors: string[] = [];
    for (const item of cartItems as CartItem[]) {
      if (!item.item_id) continue;

      // Fetch current stock
      const { data: current, error: fetchErr } = await admin
        .from('inventory_item')
        .select('stock_quantity')
        .eq('item_id', item.item_id)
        .single();

      if (fetchErr || !current) {
        stockErrors.push(`Could not fetch stock for item ${item.item_id}`);
        continue;
      }

      const newQty = Math.max(0, current.stock_quantity - item.quantity);
      const { error: updateErr } = await admin
        .from('inventory_item')
        .update({ stock_quantity: newQty, updated_at: new Date().toISOString() })
        .eq('item_id', item.item_id);

      if (updateErr) {
        stockErrors.push(`Could not update stock for item ${item.item_id}: ${updateErr.message}`);
      }
    }

    if (stockErrors.length > 0) {
      console.error('[POST /api/sales] Stock deduction errors:', stockErrors);
      // Sale was created — return success but include a warning
      return NextResponse.json({ sale_id: saleId, stockWarnings: stockErrors });
    }

    // 5. Return the sale_id
    return NextResponse.json({ sale_id: saleId });

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Full error creating sale:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}