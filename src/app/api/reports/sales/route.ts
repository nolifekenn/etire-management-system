import { supabaseUntyped as supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const filters = await request.json();

    if (!supabase) {
      return NextResponse.json({ error: "Supabase client not initialized" }, { status: 500 });
    }

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
        service_job_id,
        sale_date:created_at,
        customer:customer_id ( name ),
        service_job:service_job_id ( service_fee ),
        sale_item (
          item_id,
          quantity,
          price_at_sale,
          installation_fee,
          inventory_item (
            name,
            category,
            cost_price
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

    // 4️⃣ Post-process data to calculate line_total and profit
    const processedData = data.map((sale: Record<string, unknown>) => {
      const serviceFee: number = ((sale.service_job as Record<string, unknown>)?.service_fee as number) ?? 0;

      const processedItems = (sale.sale_item as Record<string, unknown>[]).map((item: Record<string, unknown>) => {
        const quantity = (item.quantity as number) || 0;
        const price = (item.price_at_sale as number) || 0;
        const cost = ((item.inventory_item as Record<string, unknown>)?.cost_price as number) || 0;

        const line_total = quantity * price;
        const profit = (price - cost) * quantity;

        return {
          ...item,
          line_total,
          profit
        };
      });

      // Add a synthetic "Service Labor Fee" item so that service fee profit
      // is included in the SalesReportCard totalProfit sum (labor cost = 0)
      if (serviceFee > 0) {
        processedItems.push({
          item_id: null,
          quantity: 1,
          price_at_sale: serviceFee,
          installation_fee: 0,
          line_total: serviceFee,
          profit: serviceFee,
          inventory_item: {
            name: "Service Labor Fee",
            category: "service",
            cost_price: 0
          }
        });
      }

      return {
        ...sale,
        sale_item: processedItems
      };
    });

    // 5️⃣ Return sales data
    return NextResponse.json({ sales: processedData });
  } catch (error: unknown) {
    console.error("Sales report route error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected server error" },
      { status: 500 }
    );
  }
}
