import type { SupabaseClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient, getUserSafe } from '@/lib/supabaseServer';
import { READ_ONLY_BACKUP_TABLES, TABLE_DEPENDENCY_ORDER, type BackupTableName } from '@/lib/backupTables';

type TableDump = Partial<Record<BackupTableName, unknown[]>>;

interface BackupPayload {
  meta?: Record<string, unknown>;
  tables?: TableDump;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { user, error: authError } = await getUserSafe(supabase);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { data?: BackupPayload; fileName?: string } | null;

  if (!body?.data?.tables) {
    return NextResponse.json({ error: 'Invalid payload. Missing tables.' }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as SupabaseClient<any>;
  let restoredTables = 0;
  const warnings: string[] = [];
  const readOnlyTables = new Set<string>(READ_ONLY_BACKUP_TABLES as readonly string[]);
  const isMissingRelation = (message?: string) =>
    Boolean(message && /does not exist|relation .* does not exist/i.test(message));

  for (const tableName of TABLE_DEPENDENCY_ORDER) {
    const rows = body.data.tables?.[tableName];

    if (readOnlyTables.has(tableName)) {
      continue;
    }

    if (Array.isArray(rows) && rows.length > 0) {
      const { error } = await admin
        .from(tableName)
        .upsert(rows as Record<string, unknown>[]);

      if (error) {
        if (isMissingRelation(error.message)) {
          console.warn(`[backup/import] Skipping ${tableName}:`, error.message);
          warnings.push(`Skipped ${tableName}: ${error.message}`);
          continue;
        }
        console.error(`[backup/import] Failed to restore ${tableName}:`, error.message);
        return NextResponse.json({ error: `Failed to import ${tableName}` }, { status: 500 });
      }

      restoredTables += 1;
    }
  }

  return NextResponse.json({ restoredTables, warnings });
}
