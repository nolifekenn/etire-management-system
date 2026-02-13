import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { TABLE_DEPENDENCY_ORDER, type BackupTableName } from '@/lib/backupTables';

type TableDump = Partial<Record<BackupTableName, unknown[]>>;

interface BackupPayload {
  meta?: Record<string, unknown>;
  tables?: TableDump;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data, error: sessionError } = await supabase.auth.getSession();

  if (sessionError || !data.session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { data?: BackupPayload; fileName?: string } | null;

  if (!body?.data?.tables) {
    return NextResponse.json({ error: 'Invalid payload. Missing tables.' }, { status: 400 });
  }

  const admin = createAdminClient() as SupabaseClient<any>;
  let restoredTables = 0;

  for (const tableName of TABLE_DEPENDENCY_ORDER) {
    const rows = body.data.tables?.[tableName];

    if (Array.isArray(rows) && rows.length > 0) {
      const { error } = await admin
        .from(tableName)
        .upsert(rows as Record<string, unknown>[]);

      if (error) {
        console.error(`[backup/import] Failed to restore ${tableName}:`, error.message);
        return NextResponse.json({ error: `Failed to import ${tableName}` }, { status: 500 });
      }

      restoredTables += 1;
    }
  }

  return NextResponse.json({ restoredTables });
}
