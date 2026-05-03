import { Buffer } from 'node:buffer';
import { NextResponse } from 'next/server';
import { createAdminClient, createClient, getUserSafe } from '@/lib/supabaseServer';
import { READ_ONLY_BACKUP_TABLES, TABLE_DEPENDENCY_ORDER, type BackupTableName } from '@/lib/backupTables';

type TableDump = Partial<Record<BackupTableName, unknown[]>>;

export async function POST() {
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
        console.warn(`[backup/sync] Skipping ${tableName}:`, error.message);
        warnings.push(`Skipped ${tableName}: ${error.message}`);
        continue;
      }
      console.error(`[backup/sync] Failed to fetch ${tableName}:`, error.message);
      return NextResponse.json({ error: `Failed to fetch ${tableName}` }, { status: 500 });
    }

    tables[tableName] = (rows ?? []) as unknown[];
  }

  const payload = {
    meta: {
      version: '1.0',
      synced_at: new Date().toISOString(),
      synced_by: user.id,
      type: 'cloud_sync'
    },
    tables
  };

  const fileName = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  const fileContents = Buffer.from(JSON.stringify(payload, null, 2));

  const { error: uploadError } = await admin.storage
    .from('backups')
    .upload(fileName, fileContents, {
      contentType: 'application/json',
      upsert: false
    });

  if (uploadError) {
    console.error('[backup/sync] Upload failed:', uploadError.message);
    return NextResponse.json({ error: 'Failed to upload backup to storage.' }, { status: 500 });
  }

  return NextResponse.json({ fileName, warnings });
}
