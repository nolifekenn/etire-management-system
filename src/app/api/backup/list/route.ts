import { NextResponse } from 'next/server';
import { createAdminClient, createClient, getUserSafe } from '@/lib/supabaseServer';

export async function GET() {
  const supabase = await createClient();
  const { user, error: authError } = await getUserSafe(supabase);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: files, error } = await admin.storage.from('backups').list('', {
    limit: 50,
    sortBy: { column: 'created_at', order: 'desc' },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ files: files ?? [] });
}
