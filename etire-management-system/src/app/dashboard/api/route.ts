import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET dashboard statistics and data
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

  // Get sales data for the last 7 days
  if (type === "sales") {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data, error } = await supabase
      .from("sale")
      .select("sale_date, total_amount")
      .gte("sale_date", sevenDaysAgo.toISOString())
      .order("sale_date", { ascending: false });

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json(data);
  }

  // Get low stock items
  if (type === "low-stock") {
    const { data, error } = await supabase
      .from("inventory_item")
      .select("*")
      .lte("stock_quantity", 10)
      .order("stock_quantity", { ascending: true })
      .limit(10);

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json(data);
  }

  // Get recent sales
  if (type === "recent-sales") {
    const { data, error } = await supabase
      .from("sale_item")
      .select(`
        *,
        inventory_item:item_id(name, category),
        user:user_id(name)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json(data);
  }

  // Get notifications
  if (type === "notifications") {
    const { data, error } = await supabase
      .from("notification")
      .select("*")
      .eq("user_id", user_id)
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json(data);
  }

  // Default: Get all dashboard stats
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Parallel fetch all counts and data
    const [
      salesRes,
      itemsRes,
      usersRes,
      jobsRes,
      branchesRes,
      suppliersRes,
      customersRes,
      vehiclesRes,
      notificationsRes,
    ] = await Promise.all([
      supabase
        .from("sale")
        .select("total_amount")
        .gte("sale_date", sevenDaysAgo.toISOString()),
      supabase.from("inventory_item").select("*", { count: "exact", head: true }),
      supabase.from("user").select("*", { count: "exact", head: true }),
      supabase
        .from("service_job")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("branch")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase
        .from("supplier")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true),
      supabase.from("customer").select("*", { count: "exact", head: true }),
      supabase.from("vehicle").select("*", { count: "exact", head: true }),
      supabase
        .from("notification")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user_id)
        .eq("is_read", false),
    ]);

    // Calculate total sales
    const totalSales =
      salesRes.data?.reduce((acc: number, sale: any) => acc + sale.total_amount, 0) || 0;

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

    return NextResponse.json(stats);
  } catch (error: any) {
    return NextResponse.json(
      { error: { message: error.message } },
      { status: 500 }
    );
  }
}