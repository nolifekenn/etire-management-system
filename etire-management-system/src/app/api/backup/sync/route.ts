import { Buffer } from 'node:buffer';
import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabaseServer';
import { TABLE_DEPENDENCY_ORDER, type BackupTableName } from '@/lib/backupTables';

type TableDump = Partial<Record<BackupTableName, unknown[]>>;

export async function POST() {
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
      console.error(`[backup/sync] Failed to fetch ${tableName}:`, error.message);
      return NextResponse.json({ error: `Failed to fetch ${tableName}` }, { status: 500 });
    }

    tables[tableName] = (rows ?? []) as unknown[];
  }

  const payload = {
    meta: {
      version: '1.0',
      synced_at: new Date().toISOString(),
      synced_by: data.session.user.id,
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

  return NextResponse.json({ fileName });
}
