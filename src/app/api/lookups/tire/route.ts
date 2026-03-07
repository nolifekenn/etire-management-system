import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabaseServer';

type LookupType = 'size' | 'brand';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const [sizesResult, brandsResult] = await Promise.all([
    admin.from('tire_size').select('size_id,label').order('label'),
    admin.from('tire_brand').select('brand_id,name').order('name')
  ]);

  if (sizesResult.error || brandsResult.error) {
    const err = sizesResult.error || brandsResult.error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  return NextResponse.json({ sizes: sizesResult.data, brands: brandsResult.data });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { type?: LookupType; value?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const { type, value } = body;
  if (!type || !value || (type !== 'size' && type !== 'brand')) {
    return NextResponse.json({ error: 'Specify a valid lookup type and value.' }, { status: 400 });
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return NextResponse.json({ error: 'Value cannot be empty.' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any;

  const response = type === 'size'
    ? await admin
        .from('tire_size')
        .insert({ label: trimmedValue })
        .select()
        .single()
    : await admin
        .from('tire_brand')
        .insert({ name: trimmedValue })
        .select()
        .single();

  const { data, error } = response;

  if (error) {
    if (error.code === '23505') {
      const message = type === 'size'
        ? 'That tire size already exists.'
        : 'That tire brand already exists.';
      return NextResponse.json({ error: message }, { status: 409 });
    }

    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
