import { supabaseUntyped as supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

interface ServiceRevenueLine {
  price_at_sale: number | null;
  quantity: number | null;
  sale?: {
    service_job_id?: string | null;
  } | null;
}

interface ServiceJobRow {
  job_id: string;
  job_date: string | null;
  job_description: string | null;
  status: string | null;
  service_fee?: number | null;
  remarks?: string | null;
  vehicle_type?: { name?: string | null } | null;
  customer?: { name?: string | null } | null;
  vehicle?: { plate_number?: string | null } | null;
}

interface ServiceJobItemRow {
  job_id: string;
  quantity: number | null;
  inventory_item?: { sale_price?: number | null } | null;
}

export async function POST(request: Request) {
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  try {
    const filters = await request.json();

    const deriveServiceFeesByJob = async (jobIds: string[]) => {
      const feeMap = new Map<string, number>();
      if (jobIds.length === 0) return feeMap;

      const serviceLinesQuery = supabase
        .from('sale_item')
        .select(`
          quantity,
          price_at_sale,
          inventory_item!inner (
            category
          ),
          sale!inner (
            service_job_id,
            deleted_at
          )
        `)
        .eq('inventory_item.category', 'service')
        .is('deleted_at', null)
        .is('sale.deleted_at', null)
        .in('sale.service_job_id', jobIds);

      const { data, error } = await serviceLinesQuery;

      if (error) {
        console.error('Service fee fallback query error:', error);
        return feeMap;
      }

      const rows = (data || []) as ServiceRevenueLine[];

      rows.forEach((row) => {
        const jobId = row.sale?.service_job_id;
        if (!jobId) return;
        const amount = (row.price_at_sale || 0) * (row.quantity || 0);
        feeMap.set(jobId, (feeMap.get(jobId) || 0) + amount);
      });

      return feeMap;
    };

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

    const jobsResult = await query;
    let jobs = (jobsResult.data || null) as ServiceJobRow[] | null;
    let serviceFeeFallbackNeeded = false;

    if (jobsResult.error) {
      console.error("Service job query error:", jobsResult.error);

      if (jobsResult.error.message?.toLowerCase().includes('service_fee')) {
        serviceFeeFallbackNeeded = true;

        let fallbackQuery = supabase
          .from('service_job')
          .select(`
            job_id,
            job_date,
            job_description,
            status,
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
          fallbackQuery = fallbackQuery.eq("vehicle_type_id", filters.vehicle_type_id);
        }

        if (filters.status && filters.status !== "") {
          fallbackQuery = fallbackQuery.eq("status", filters.status);
        }

        if (filters.date_from && filters.date_to) {
          const start = `${filters.date_from}T00:00:00Z`;
          const end = `${filters.date_to}T23:59:59Z`;
          fallbackQuery = fallbackQuery.gte("job_date", start).lte("job_date", end);
        }

        const fallbackResult = await fallbackQuery;
        if (fallbackResult.error) {
          console.error('Service job fallback query error:', fallbackResult.error);
          return NextResponse.json({ error: fallbackResult.error.message }, { status: 500 });
        }

        jobs = (fallbackResult.data || null) as ServiceJobRow[] | null;
      } else {
        return NextResponse.json({ error: jobsResult.error.message }, { status: 500 });
      }
    }

    // 2️⃣ Fetch job items with linked inventory prices
    const jobIds = jobs?.map((job) => job.job_id) || [];
    let items: ServiceJobItemRow[] = [];

    if (jobIds.length > 0) {
      const { data: itemRows, error: itemError } = await supabase
        .from("service_job_item")
        .select(`
          job_id,
          quantity,
          inventory_item: item_id (
            sale_price
          )
        `)
        .in('job_id', jobIds);

      if (itemError) {
        console.error("Service job item query error:", itemError);
        return NextResponse.json({ error: itemError.message }, { status: 500 });
      }

      items = (itemRows || []) as ServiceJobItemRow[];
    }

    const derivedServiceFees = serviceFeeFallbackNeeded ? await deriveServiceFeesByJob(jobIds) : new Map<string, number>();

    // 3️⃣ Aggregate totals per job_id
    const jobTotals = new Map<string, number>();
    for (const item of items) {
      const price = item.inventory_item?.sale_price || 0;
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
    const transformed = (jobs || []).map((job) => {
      const rawServiceFee = job.service_fee ?? derivedServiceFees.get(job.job_id) ?? 0;
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
  } catch (error: unknown) {
    console.error("Service report route error:", error);
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
