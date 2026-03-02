import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabaseServer';

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// GET: Fetch a single inventory item by item_id (for hydrating edit form lookups)
export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const item_id = searchParams.get('item_id');
  if (!item_id) return NextResponse.json({ error: 'item_id is required' }, { status: 400 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from('inventory_item')
    .select('size_id, brand_id')
    .eq('item_id', item_id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// POST: Create a new inventory item
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  let body: {
    name?: string;
    category?: string;
    vehicle_type?: string;
    cost_price?: number;
    sale_price?: number;
    stock_quantity?: number;
    branch_id?: string;
    size_id?: string | null;
    brand_id?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, category, vehicle_type, cost_price, sale_price, stock_quantity, branch_id, size_id, brand_id } = body;

  if (!name || !category || !branch_id) {
    return NextResponse.json({ error: 'name, category, and branch_id are required' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('inventory_item')
    .insert([{
      name,
      category,
      vehicle_type: vehicle_type ?? null,
      cost_price: cost_price ?? 0,
      sale_price: sale_price ?? 0,
      stock_quantity: stock_quantity ?? 0,
      branch_id,
      size_id: size_id ?? null,
      brand_id: brand_id ?? null,
    }])
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

// PATCH: Update an inventory item (edit fields, stock adjustment, soft delete)
export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { item_id, ...updateFields } = body;

  if (!item_id || typeof item_id !== 'string') {
    return NextResponse.json({ error: 'item_id is required' }, { status: 400 });
  }

  const { data, error } = await admin
    .from('inventory_item')
    .update(updateFields)
    .eq('item_id', item_id)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
