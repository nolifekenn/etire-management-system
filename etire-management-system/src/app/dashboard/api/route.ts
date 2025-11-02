import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const user_id = searchParams.get("user_id");

  if (!user_id) {
    return NextResponse.json(
      { error: { message: "user_id is required" } },
      { status: 400 }
    );
  }

  // Get sales data for the last 7 days (from sale_item)
  if (type === "sales") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("sale_item")
      .select("created_at, quantity, price_at_sale, sale:sale_id(sale_date)")
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Sales fetch error:", error);
      return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    }

    // Transform to match expected format
    const salesData = (data || []).map((item: any) => ({
      sale_date: item.sale?.sale_date || item.created_at,
      total_amount: Number(item.quantity || 0) * Number(item.price_at_sale || 0)
    }));

    return NextResponse.json(salesData);
  }

  // Get low stock items
  if (type === "low-stock") {
    const { data, error } = await supabase
      .from("inventory_item")
      .select("*")
      .filter("stock_quantity", "lte", "reorder_level")
      .order("stock_quantity", { ascending: true })
      .limit(10);

    if (error) {
      console.error("Low stock fetch error:", error);
      return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    }
    return NextResponse.json(data || []);
  }

  // Get recent sales
  if (type === "recent-sales") {
    const { data, error } = await supabase
      .from("sale_item")
      .select(`
        *,
        inventory_item:item_id(name, category),
        sale:sale_id(user:user_id(name))
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("Recent sales fetch error:", error);
      return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    }

    // Flatten the nested user data
    const formattedData = (data || []).map(item => ({
      ...item,
      user: item.sale?.user || null
    }));

    return NextResponse.json(formattedData);
  }

  // Get notifications
  if (type === "notifications") {
    const { data, error } = await supabase
      .from("notification")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("Notifications fetch error:", error);
      return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    }
    return NextResponse.json(data || []);
  }

  // Default: Get all dashboard stats
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Parallel fetch all counts and data
    const [
      salesRes,
      itemsRes,
      customersRes,
      jobsRes,
      branchesRes,
      suppliersRes,
      vehiclesRes,
      notificationsRes,
    ] = await Promise.all([
      supabase
        .from("sale_item")
        .select("quantity, price_at_sale")
        .gte("created_at", sevenDaysAgo.toISOString()),
      supabase.from("inventory_item").select("item_id", { count: "exact", head: true }),
      supabase.from("customer").select("customer_id", { count: "exact", head: true }),
      supabase
        .from("service_job")
        .select("job_id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("branch")
        .select("branch_id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("supplier")
        .select("supplier_id", { count: "exact", head: true })
        .eq("is_active", true),
      supabase.from("vehicle").select("vehicle_id", { count: "exact", head: true }),
      supabase
        .from("notification")
        .select("notification_id", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("is_read", false),
    ]);

    // Log any errors
    if (salesRes.error) console.error("Sales count error:", salesRes.error);
    if (itemsRes.error) console.error("Items count error:", itemsRes.error);
    if (customersRes.error) console.error("Customers count error:", customersRes.error);
    if (jobsRes.error) console.error("Jobs count error:", jobsRes.error);
    if (branchesRes.error) console.error("Branches count error:", branchesRes.error);
    if (suppliersRes.error) console.error("Suppliers count error:", suppliersRes.error);
    if (vehiclesRes.error) console.error("Vehicles count error:", vehiclesRes.error);
    if (notificationsRes.error) console.error("Notifications count error:", notificationsRes.error);

    // Calculate total sales from sale_item (quantity * price_at_sale)
    const totalSales = salesRes.error
      ? 0
      : (salesRes.data || []).reduce(
          (sum: number, item: any) =>
            sum + Number(item.quantity || 0) * Number(item.price_at_sale || 0),
          0
        );

    const stats = {
      total_sales: totalSales,
      total_items: itemsRes.count ?? 0,
      total_customers: customersRes.count ?? 0,
      pending_jobs: jobsRes.count ?? 0,
      total_branches: branchesRes.count ?? 0,
      total_suppliers: suppliersRes.count ?? 0,
      total_vehicles: vehiclesRes.count ?? 0,
      unread_notifications: notificationsRes.count ?? 0,
    };

    console.log("Dashboard stats:", stats);
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: { message: error.message || "Unknown error occurred" } },
      { status: 500 }
    );
  }
}