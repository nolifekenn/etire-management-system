import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

// Define the type for a cart item
interface CartItem {
  item_id: string;
  quantity: number;
  sale_price: number;
}

export async function POST(request: Request) {
  const { customerId, cartItems, paymentMethod, userId, branchId } = await request.json();

  // 1. Validate input
  if (!userId || !cartItems || cartItems.length === 0) {
    return NextResponse.json({ error: "Missing required sale data." }, { status: 400 });
  }

  try {
    // 2. Calculate total amount from the cart
    const total_amount = cartItems.reduce((acc: number, item: CartItem) => acc + item.sale_price * item.quantity, 0);

    // 3. Create the 'sale' record
    // We are using the 'supabase' client from your lib
    const { data: saleData, error: saleError } = await supabase
      .from('sale')
      .insert({
        user_id: userId,
        customer_id: customerId, // This is `null` for anonymous
        branch_id: branchId,     // This can be `null`
        payment_method: paymentMethod,
        total_amount: total_amount,
        discount_amount: 0, // Placeholder
        tax_amount: 0,      // Placeholder
      })
      .select()
      .single();

    if (saleError) {
      throw new Error(`Error creating sale: ${saleError.message}`);
    }

    const saleId = saleData.sale_id;

    // 4. Create 'sale_item' records
    const saleItems = cartItems.map((item: CartItem) => ({
      sale_id: saleId,
      item_id: item.item_id,
      quantity: item.quantity,
      price_at_sale: item.sale_price,
    }));

    const { error: itemsError } = await supabase.from('sale_item').insert(saleItems);

    if (itemsError) {
      // If items fail to save, roll back the sale
      await supabase.from('sale').delete().eq('sale_id', saleId);
      throw new Error(`Error saving sale items: ${itemsError.message}`);
    }

    // 5. Return JUST the sale_id.
    // The client (page.tsx) will handle the receipt generation.
    return NextResponse.json({ sale_id: saleId });

  } catch (error: any) {
    console.error("Full error creating sale:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}