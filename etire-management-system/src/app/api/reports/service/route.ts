import { supabaseUntyped as supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  try {
    const filters = await request.json();

    // 1️⃣ Fetch service jobs with vehicle_type name
    let query = supabase
      .from("service_job")
      .select(`
        job_id,
        job_date,
        job_description,
        status,
        service_fee,
        remarks,
        vehicle_type:vehicle_type_id (
          name
        ),
        customer:customer_id (
          name
        ),
        vehicle:vehicle_id (
          plate_number
        )
      `);

    if (filters.vehicle_type_id && filters.vehicle_type_id !== "") {
      query = query.eq("vehicle_type_id", filters.vehicle_type_id);
    }

    if (filters.status && filters.status !== "") {
      query = query.eq("status", filters.status);
    }

    if (filters.date_from && filters.date_to) {
      const start = `${filters.date_from}T00:00:00Z`;
      const end = `${filters.date_to}T23:59:59Z`;
      query = query.gte("job_date", start).lte("job_date", end);
    }

    const { data: jobs, error: jobError } = await query;
    if (jobError) {
      console.error("Service job query error:", jobError);
      return NextResponse.json({ error: jobError.message }, { status: 500 });
    }

    // 2️⃣ Fetch job items with linked inventory prices
    const { data: items, error: itemError } = await supabase
      .from("service_job_item")
      .select(`
        job_id,
        quantity,
        item: item_id (
          sale_price
        )
      `);

    if (itemError) {
      console.error("Service job item query error:", itemError);
      return NextResponse.json({ error: itemError.message }, { status: 500 });
    }

    // 3️⃣ Aggregate totals per job_id
    const jobTotals = new Map<string, number>();
    for (const item of (items || []) as any[]) {
      const price = (item.item as any)?.sale_price || 0;
      const total = price * (item.quantity || 0);
      const current = jobTotals.get(item.job_id) || 0;
      jobTotals.set(item.job_id, current + total);
    }

    // 4️⃣ Format helpers
    const formatCurrency = (amount: number) =>
      `₱${amount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    // 5️⃣ Merge and transform
    const transformed = (jobs || []).map((job: any) => {
      const rawServiceFee = job.service_fee ?? 0;
      const rawJobTotal = jobTotals.get(job.job_id) ?? 0;

      return {
        job_id: job.job_id,
        job_timestamp: job.job_date ? new Date(job.job_date).getTime() : null, // numeric for sorting
        job_date: job.job_date ? job.job_date.substring(0, 10) : "—",          // truncated YYYY-MM-DD for display
        job_description: job.job_description || "—",
        status: job.status || "—",
        remarks: job.remarks || "—",
        customer: job.customer?.name || "—",
        vehicle: job.vehicle?.plate_number || "—",
        vehicle_type: job.vehicle_type?.name || "—",
        service_fee_raw: rawServiceFee,
        service_fee: formatCurrency(rawServiceFee),
        job_total_raw: rawJobTotal,
        job_total: formatCurrency(rawJobTotal),
      };
    });

    return NextResponse.json({ jobs: transformed });
  } catch (error: any) {
    console.error("Service report route error:", error);
    return NextResponse.json(
      { error: error.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
