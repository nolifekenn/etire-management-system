import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { TABLE_DEPENDENCY_ORDER, type BackupTableName } from '@/lib/backupTables';

type TableDump = Partial<Record<BackupTableName, unknown[]>>;

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const tables: TableDump = {};

  for (const tableName of TABLE_DEPENDENCY_ORDER) {
    const { data: rows, error } = await admin.from(tableName).select('*');

    if (error) {
      console.error(`[backup/export] Failed to fetch ${tableName}:`, error.message);
      return NextResponse.json({ error: `Failed to fetch ${tableName}` }, { status: 500 });
    }

    tables[tableName] = (rows ?? []) as unknown[];
  }

  const tableCount = TABLE_DEPENDENCY_ORDER.filter(
    (name) => (tables[name]?.length ?? 0) > 0
  ).length;

  return NextResponse.json({
    tables,
    tableCount,
    exportedAt: new Date().toISOString()
  });
}
