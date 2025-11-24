import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const filters = await request.json();

    // 1️⃣ Base query (no nested joins)
    let query = supabase
      .from("inventory_item")
      .select(`
        item_id,
        name,
        category,
        stock_quantity,
        cost_price,
        sale_price,
        branch_id,
        supplier_id,
        reorder_level
      `);

    // 2️⃣ Apply filters
    if (filters.branch_id) {
      query = query.eq("branch_id", filters.branch_id);
    }
    if (filters.supplier_id) {
      query = query.eq("supplier_id", filters.supplier_id);
    }
    if (filters.category) {
      query = query.ilike("category", `%${filters.category}%`);
    }

    // 3️⃣ Execute inventory query
    const { data: items, error: itemError } = await query;

    if (itemError) {
      console.error("Inventory report query error:", itemError);
      return NextResponse.json({ error: itemError.message }, { status: 500 });
    }

    // 4️⃣ Fetch supplier names
    const { data: suppliers, error: supplierError } = await supabase
      .from("supplier")
      .select("supplier_id, name");

    if (supplierError) {
      console.error("Supplier fetch error:", supplierError);
      return NextResponse.json({ error: supplierError.message }, { status: 500 });
    }

    // 5️⃣ Transform data
    const transformed = (items || []).map((item: any) => {
      const supplier = suppliers?.find((s) => s.supplier_id === item.supplier_id);
      const stock_value = (item.stock_quantity || 0) * (item.cost_price || 0);
      const potential_revenue = (item.stock_quantity || 0) * (item.sale_price || 0);
      const low_stock = (item.stock_quantity || 0) < (item.reorder_level ?? 5);

      return {
        ...item,
        category: item.category || "—",
        supplier: supplier?.name || "—",
        stock_value,
        potential_revenue,
        low_stock,
      };
    });

    return NextResponse.json({ inventory: transformed });
  } catch (error: any) {
    console.error("Inventory report route error:", error);
    return NextResponse.json(
      { error: error.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
