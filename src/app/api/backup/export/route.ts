import { NextResponse } from 'next/server';
import { createAdminClient, createClient, getUserSafe } from '@/lib/supabaseServer';
import { READ_ONLY_BACKUP_TABLES, TABLE_DEPENDENCY_ORDER, type BackupTableName } from '@/lib/backupTables';

type TableDump = Partial<Record<BackupTableName, unknown[]>>;

export async function GET() {
  const supabase = await createClient();
  const { user, error: authError } = await getUserSafe(supabase);

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const tables: TableDump = {};
  const warnings: string[] = [];
  const readOnlyTables = new Set<string>(READ_ONLY_BACKUP_TABLES as readonly string[]);
  const isMissingRelation = (message?: string) =>
    Boolean(message && /does not exist|relation .* does not exist/i.test(message));

  for (const tableName of TABLE_DEPENDENCY_ORDER) {
    const { data: rows, error } = await admin.from(tableName).select('*');

    if (error) {
      const warnable = readOnlyTables.has(tableName) || isMissingRelation(error.message);
      if (warnable) {
        console.warn(`[backup/export] Skipping ${tableName}:`, error.message);
        warnings.push(`Skipped ${tableName}: ${error.message}`);
        continue;
      }
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
    exportedAt: new Date().toISOString(),
    warnings
  });
}
