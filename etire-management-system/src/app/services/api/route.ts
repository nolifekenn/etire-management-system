import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const user_id = searchParams.get('user_id');

    // Get vehicle types from database
    if (type === 'vehicle-types') {
      const { data, error } = await supabase
        .from('vehicle_type')
        .select('*')
        .order('name');

      if (error) {
        console.error('Vehicle types fetch error:', error);
        return NextResponse.json({ error: { message: error.message } }, { status: 500 });
      }

      return NextResponse.json(data || []);
    }

    // Get all service jobs with vehicle type details
    if (type === 'all' || !type) {
      const { data, error } = await supabase
        .from('service_job')
        .select('*, user:user_id(name), vehicle_type:vehicle_type_id(vehicle_type_id, name)')
        .order('job_date', { ascending: false });

      if (error) {
        console.error('Service jobs fetch error:', error);
        return NextResponse.json({ error: { message: error.message } }, { status: 500 });
      }

      return NextResponse.json(data || []);
    }

    // Get jobs by status
    if (type === 'by-status') {
      const status = searchParams.get('status');
      if (!status) {
        return NextResponse.json({ error: { message: 'status parameter required' } }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('service_job')
        .select('*, user:user_id(name), vehicle_type:vehicle_type_id(vehicle_type_id, name)')
        .eq('status', status)
        .order('job_date', { ascending: false });

      if (error) {
        console.error('Service jobs by status fetch error:', error);
        return NextResponse.json({ error: { message: error.message } }, { status: 500 });
      }

      return NextResponse.json(data || []);
    }

    // Get jobs by user (employee)
    if (type === 'by-user') {
      if (!user_id) {
        return NextResponse.json({ error: { message: 'user_id parameter required' } }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('service_job')
        .select('*, user:user_id(name), vehicle_type:vehicle_type_id(vehicle_type_id, name)')
        .eq('user_id', user_id)
        .order('job_date', { ascending: false });

      if (error) {
        console.error('Service jobs by user fetch error:', error);
        return NextResponse.json({ error: { message: error.message } }, { status: 500 });
      }

      return NextResponse.json(data || []);
    }

    // Get service job stats
    if (type === 'stats') {
      const [pendingRes, inProgressRes, completedRes, cancelledRes, totalRevenueRes] = await Promise.all([
        supabase.from('service_job').select('job_id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('service_job').select('job_id', { count: 'exact', head: true }).eq('status', 'in-progress'),
        supabase.from('service_job').select('job_id', { count: 'exact', head: true }).eq('status', 'completed'),
        supabase.from('service_job').select('job_id', { count: 'exact', head: true }).eq('status', 'cancelled'),
        supabase.from('service_job').select('service_fee').eq('status', 'completed'),
      ]);

      if (pendingRes.error) console.error('Pending jobs count error:', pendingRes.error);
      if (inProgressRes.error) console.error('In-progress jobs count error:', inProgressRes.error);
      if (completedRes.error) console.error('Completed jobs count error:', completedRes.error);
      if (cancelledRes.error) console.error('Cancelled jobs count error:', cancelledRes.error);
      if (totalRevenueRes.error) console.error('Revenue calculation error:', totalRevenueRes.error);

      const totalRevenue = totalRevenueRes.error
        ? 0
        : (totalRevenueRes.data || []).reduce((sum, job) => sum + Number(job.service_fee || 0), 0);

      const stats = {
        pending_jobs: pendingRes.count ?? 0,
        in_progress_jobs: inProgressRes.count ?? 0,
        completed_jobs: completedRes.count ?? 0,
        cancelled_jobs: cancelledRes.count ?? 0,
        total_revenue: totalRevenue,
        total_jobs: (pendingRes.count ?? 0) + (inProgressRes.count ?? 0) + (completedRes.count ?? 0) + (cancelledRes.count ?? 0),
      };

      return NextResponse.json(stats);
    }

    return NextResponse.json({ error: { message: 'Invalid type parameter' } }, { status: 400 });
  } catch (error: any) {
    console.error('Service jobs API error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Unknown error occurred' } },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { user_id, job_description, status, service_fee, remarks, vehicle_type_id } = body;

    if (!user_id || !job_description) {
      return NextResponse.json(
        { error: { message: 'user_id and job_description are required' } },
        { status: 400 }
      );
    }

    const jobData = {
      user_id,
      job_description,
      status: status || 'pending',
      service_fee: parseFloat(service_fee) || 0,
      remarks: remarks || null,
      vehicle_type_id: vehicle_type_id || null,
    };

    const { data, error } = await supabase.from('service_job').insert([jobData]).select().single();

    if (error) {
      console.error('Service job creation error:', error);
      return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('Service job POST error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Unknown error occurred' } },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { job_id, job_description, status, service_fee, remarks, vehicle_type_id } = body;

    if (!job_id) {
      return NextResponse.json({ error: { message: 'job_id is required' } }, { status: 400 });
    }

    const updateData: any = {};
    if (job_description !== undefined) updateData.job_description = job_description;
    if (status !== undefined) updateData.status = status;
    if (service_fee !== undefined) updateData.service_fee = parseFloat(service_fee);
    if (remarks !== undefined) updateData.remarks = remarks;
    if (vehicle_type_id !== undefined) updateData.vehicle_type_id = vehicle_type_id;

    const { data, error } = await supabase
      .from('service_job')
      .update(updateData)
      .eq('job_id', job_id)
      .select()
      .single();

    if (error) {
      console.error('Service job update error:', error);
      return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Service job PUT error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Unknown error occurred' } },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const job_id = searchParams.get('job_id');

    if (!job_id) {
      return NextResponse.json({ error: { message: 'job_id is required' } }, { status: 400 });
    }

    const { error } = await supabase.from('service_job').delete().eq('job_id', job_id);

    if (error) {
      console.error('Service job deletion error:', error);
      return NextResponse.json({ error: { message: error.message } }, { status: 500 });
    }

    return NextResponse.json({ message: 'Service job deleted successfully' });
  } catch (error: any) {
    console.error('Service job DELETE error:', error);
    return NextResponse.json(
      { error: { message: error.message || 'Unknown error occurred' } },
      { status: 500 }
    );
  }
}