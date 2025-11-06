import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { receiptGenerator } from '@/lib/receiptGenerator';

// ⚙️ POST /api/sales
// Creates a sale, its items, and generates a receipt

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, customerId, cartItems, paymentMethod = 'cash', employeeName } = body;

    if (!cartItems || cartItems.length === 0) {
      return NextResponse.json({ error: 'No items in cart.' }, { status: 400 });
    }

    // 🧾 Step 1: Compute total
    const totalAmount = cartItems.reduce((sum: number, item: any) => {
      return sum + item.quantity * item.sale_price;
    }, 0);

    // 🧾 Step 2: Create sale
    const { data: saleData, error: saleError } = await supabase
      .from('sale')
      .insert({
        user_id: userId,
        customer_id: customerId || null,
        sale_date: new Date().toISOString(),
        payment_method: paymentMethod,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: totalAmount,
      })
      .select()
      .single();

    if (saleError) {
      console.error('❌ Error creating sale:', saleError);
      throw saleError;
    }

    const saleId = saleData.sale_id;

    // 🧾 Step 3: Insert sale items
    const saleItems = cartItems.map((item: any) => ({
      sale_id: saleId,
      item_id: item.item_id,
      quantity: item.quantity,
      price_at_sale: item.sale_price,
    }));

    const { error: saleItemsError } = await supabase.from('sale_item').insert(saleItems);
    if (saleItemsError) {
      console.error('❌ Error inserting sale items:', saleItemsError);
      throw saleItemsError;
    }

    // 🧾 Step 4: Update inventory stock
    for (const item of cartItems) {
      const { error: stockError } = await supabase
        .from('inventory_item')
        .update({
          stock_quantity: item.stock_quantity - item.quantity,
        })
        .eq('item_id', item.item_id);
      if (stockError) throw stockError;
    }

    // 🧾 Step 5: Generate Receipt
    const receiptResult = await receiptGenerator.generateCompleteReceipt(
      saleId,
      {
        customer_id: customerId,
        customer_name: body.customerName || 'Walk-in Customer',
        customer_email: body.customerEmail,
        employee_name: employeeName,
        total_amount: totalAmount,
        payment_method: paymentMethod,
      },
      cartItems
    );

    console.log('✅ Receipt generated:', receiptResult);

    return NextResponse.json(
      {
        message: 'Sale completed successfully!',
        saleId,
        receipt: receiptResult,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('❌ Error creating sale:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
