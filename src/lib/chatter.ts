/**
 * chatter.ts
 * ----------
 * Universal chatter/message system API.
 * Works with the `chatter_message` table (phase1_foundation.sql).
 *
 * Table: chatter_message
 *   id            uuid  PK
 *   record_table  text  (e.g. 'purchase_order')
 *   record_id     uuid
 *   author_id     uuid  → user(user_id)
 *   message_type  chatter_message_type ('comment','state_change','system','activity_done')
 *   subject       text
 *   body          text  NOT NULL
 *   old_state     text
 *   new_state     text
 *   attachments   jsonb  DEFAULT '[]'
 *   is_internal   boolean DEFAULT false
 *   created_at    timestamptz
 */

import { createClient } from '@/lib/supabaseServer';

// Convenience alias — new tables are not yet in the generated Database types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

// ── Types ──────────────────────────────────────────────────────────────────

export type ChatterMessageType = 'comment' | 'state_change' | 'system' | 'activity_done';

export interface ChatterMessage {
  id:            string;
  record_table:  string;
  record_id:     string;
  author_id:     string | null;
  message_type:  ChatterMessageType;
  subject:       string | null;
  body:          string;
  old_state:     string | null;
  new_state:     string | null;
  is_internal:   boolean;
  attachments:   AttachmentMeta[];
  created_at:    string;
  // Joined fields
  author_name?:  string;
  author_username?: string;
}

export interface AttachmentMeta {
  name:      string;
  url:       string;
  mime_type: string;
}

export interface AddNoteParams {
  relatedTable:    string;
  relatedRecordId: string;
  userId:          string;
  message:         string;
  isInternal?:     boolean;
  attachments?:    AttachmentMeta[];
}

export interface AddActivityParams {
  relatedTable:    string;
  relatedRecordId: string;
  userId:          string;
  activityType:    string;
  message:         string;
  dueDate:         string;   // ISO date string YYYY-MM-DD
}

// ── Add a note (comment) ───────────────────────────────────────────────────

export async function addNote(
  params: AddNoteParams
): Promise<{ id: string | null; error: string | null }> {
  const supabase: AnyClient = await createClient();

  const { data, error } = await supabase
    .from('chatter_message')
    .insert({
      record_table:  params.relatedTable,
      record_id:     params.relatedRecordId,
      author_id:     params.userId,
      message_type:  'comment',
      body:          params.message,
      is_internal:   params.isInternal ?? true,
      attachments:   params.attachments ?? [],
    })
    .select('id')
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data.id, error: null };
}

// ── Schedule an activity (logs to record_activity table) ───────────────────

export async function scheduleActivity(
  params: AddActivityParams
): Promise<{ id: string | null; error: string | null }> {
  const supabase: AnyClient = await createClient();

  // Insert into record_activity (separate table from chatter_message)
  const { data, error } = await supabase
    .from('record_activity')
    .insert({
      record_table:  params.relatedTable,
      record_id:     params.relatedRecordId,
      created_by:    params.userId,
      assigned_to:   params.userId,
      activity_type: params.activityType,
      summary:       params.message,
      date_deadline: params.dueDate,
      is_done:       false,
    })
    .select('id')
    .single();

  if (error) return { id: null, error: error.message };

  // Also log a comment to chatter
  await supabase.from('chatter_message').insert({
    record_table:  params.relatedTable,
    record_id:     params.relatedRecordId,
    author_id:     params.userId,
    message_type:  'comment',
    body:          `Scheduled activity (${params.activityType}): ${params.message} — due ${params.dueDate}`,
    is_internal:   true,
    attachments:   [],
  });

  return { id: data.id, error: null };
}

// ── Mark activity as done ──────────────────────────────────────────────────

export async function markActivityDone(
  activityId: string
): Promise<{ error: string | null }> {
  const supabase: AnyClient = await createClient();

  const { error } = await supabase
    .from('record_activity')
    .update({ is_done: true, done_at: new Date().toISOString() })
    .eq('id', activityId);

  return { error: error?.message ?? null };
}

// ── Get chatter history for a record ──────────────────────────────────────

export async function getChatter(
  relatedTable: string,
  relatedRecordId: string,
  limit = 50
): Promise<{ messages: ChatterMessage[]; error: string | null }> {
  const supabase: AnyClient = await createClient();

  const { data, error } = await supabase
    .from('chatter_message')
    .select(`
      id,
      record_table,
      record_id,
      author_id,
      message_type,
      subject,
      body,
      old_state,
      new_state,
      is_internal,
      attachments,
      created_at,
      author:author_id (
        name,
        username
      )
    `)
    .eq('record_table', relatedTable)
    .eq('record_id',    relatedRecordId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { messages: [], error: error.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = (data ?? []).map((row: any) => ({
    ...row,
    author_name:     row.author?.name ?? null,
    author_username: row.author?.username ?? null,
    author:          undefined,
  })) as ChatterMessage[];

  return { messages, error: null };
}

// ── Get open activities ────────────────────────────────────────────────────

export async function getOpenActivities(
  relatedTable: string,
  relatedRecordId: string
): Promise<{ count: number; overdue: number; error: string | null }> {
  const supabase: AnyClient = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('record_activity')
    .select('id, date_deadline')
    .eq('record_table',  relatedTable)
    .eq('record_id',     relatedRecordId)
    .eq('is_done',       false);

  if (error) return { count: 0, overdue: 0, error: error.message };

  const count   = data?.length ?? 0;
  const overdue = (data ?? []).filter((a: { date_deadline: string | null }) =>
    a.date_deadline && a.date_deadline < today
  ).length ?? 0;

  return { count, overdue, error: null };
}
