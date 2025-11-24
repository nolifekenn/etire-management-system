import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const filters = await request.json();

    // 1️⃣ Build base query
    let query = supabase
  .from("sale")
  .select(`
    sale_id,
    customer_id,
    branch_id,
    payment_method,
    total_amount,
    discount_amount,
    tax_amount,
    sale_date:created_at,
    sale_item (
      item_id,
      quantity,
      price_at_sale,
      installation_fee,
      inventory_item (
        name,
        category
      )
    )
  `);

    // 2️⃣ Apply filters if provided
    if (filters.date_from && filters.date_to) {
  const start = `${filters.date_from}T00:00:00Z`;
  const end = `${filters.date_to}T23:59:59Z`;
  query = query.gte("created_at", start).lte("created_at", end);
}
    if (filters.branchId) {
      query = query.eq("branch_id", filters.branchId);
    }
    if (filters.startDate && filters.endDate) {
      query = query.gte("created_at", filters.startDate).lte("created_at", filters.endDate);
    }
    if (filters.paymentMethod) {
      query = query.eq("payment_method", filters.paymentMethod);
    }

    // 3️⃣ Execute query
    const { data, error } = await query;

    if (error) {
      console.error("Sales report query error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 4️⃣ Return sales data
    return NextResponse.json({ sales: data });
  } catch (error: any) {
    console.error("Sales report route error:", error);
    return NextResponse.json(
      { error: error.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
