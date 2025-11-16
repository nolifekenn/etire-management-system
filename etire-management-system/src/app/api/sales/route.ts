import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

// Define the type for a cart item
interface CartItem {
  item_id: string;
  quantity: number;
  sale_price: number;
  installationFee?: number; // Fee is part of the item
}

export async function POST(request: Request) {
  const { customerId, cartItems, paymentMethod, userId, branchId } = await request.json();

  if (!userId || !cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: "Missing required sale data." }, { status: 400 });
  }

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

    // 3. Create 'sale_item' records (now much simpler)
    const saleItemsToInsert = cartItems.map((item: CartItem) => ({
      sale_id: saleId,
      item_id: item.item_id,
      quantity: item.quantity,
      price_at_sale: item.sale_price,
      installation_fee: item.installationFee || 0, // 🟢 Pass the fee directly
    }));

    const { error: itemsError } = await supabase.from('sale_item').insert(saleItemsToInsert);

    if (itemsError) {
      await supabase.from('sale').delete().eq('sale_id', saleId); // Rollback
      throw new Error(`Error saving sale items: ${itemsError.message}`);
    }

    // 4. Return the sale_id
    return NextResponse.json({ sale_id: saleId });

  } catch (error: any) {
    console.error("Full error creating sale:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}