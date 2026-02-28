/**
 * chatter.ts
 * ----------
 * Universal chatter/message system API.
 * Works with the `chatter_messages` table from phase1_corrective.sql.
 *
 * Features:
 *  - Add notes, log entries, and activities to any record
 *  - Fetch chatter history with author info
 *  - Mark activities as done
 */

import { createClient } from '@/lib/supabaseServer';

// Convenience alias — new tables are not yet in the generated Database types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

// ── Types ──────────────────────────────────────────────────────────────────

export type ChatterMessageType = 'note' | 'log' | 'activity';
export type ActivityType = 'call' | 'email' | 'meeting' | 'todo';

export interface ChatterMessage {
  message_id:        string;
  related_table:     string;
  related_record_id: string;
  user_id:           string | null;
  type:              ChatterMessageType;
  message:           string;
  old_value:         string | null;
  new_value:         string | null;
  is_internal:       boolean;
  activity_type:     ActivityType | null;
  activity_due_date: string | null;
  activity_done:     boolean;
  attachments:       AttachmentMeta[];
  created_at:        string;
  // Joined fields
  author_name?:      string;
  author_username?:  string;
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
  activityType:    ActivityType;
  message:         string;
  dueDate:         string;   // ISO date string YYYY-MM-DD
}

// ── Add a note ─────────────────────────────────────────────────────────────

export async function addNote(params: AddNoteParams): Promise<{ id: string | null; error: string | null }> {
  const supabase: AnyClient = await createClient();

  const { data, error } = await supabase
    .from('chatter_messages')
    .insert({
      related_table:     params.relatedTable,
      related_record_id: params.relatedRecordId,
      user_id:           params.userId,
      type:              'note',
      message:           params.message,
      is_internal:       params.isInternal ?? true,
      attachments:       params.attachments ?? [],
    })
    .select('message_id')
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data.message_id, error: null };
}

// ── Schedule an activity ───────────────────────────────────────────────────

export async function scheduleActivity(
  params: AddActivityParams
): Promise<{ id: string | null; error: string | null }> {
  const supabase: AnyClient = await createClient();

  const { data, error } = await supabase
    .from('chatter_messages')
    .insert({
      related_table:     params.relatedTable,
      related_record_id: params.relatedRecordId,
      user_id:           params.userId,
      type:              'activity',
      message:           params.message,
      activity_type:     params.activityType,
      activity_due_date: params.dueDate,
      activity_done:     false,
      is_internal:       true,
    })
    .select('message_id')
    .single();

  if (error) return { id: null, error: error.message };
  return { id: data.message_id, error: null };
}

// ── Mark activity as done ──────────────────────────────────────────────────

export async function markActivityDone(
  messageId: string
): Promise<{ error: string | null }> {
  const supabase: AnyClient = await createClient();

  const { error } = await supabase
    .from('chatter_messages')
    .update({ activity_done: true })
    .eq('message_id', messageId)
    .eq('type', 'activity');

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
    .from('chatter_messages')
    .select(`
      message_id,
      related_table,
      related_record_id,
      user_id,
      type,
      message,
      old_value,
      new_value,
      is_internal,
      activity_type,
      activity_due_date,
      activity_done,
      attachments,
      created_at,
      user:user_id (
        name,
        username
      )
    `)
    .eq('related_table', relatedTable)
    .eq('related_record_id', relatedRecordId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { messages: [], error: error.message };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages = (data ?? []).map((row: any) => ({
    ...row,
    author_name:     row.user?.name ?? null,
    author_username: row.user?.username ?? null,
    user:            undefined,
  })) as ChatterMessage[];

  return { messages, error: null };
}

// ── Get open activities (for activity badge counts) ────────────────────────

export async function getOpenActivities(
  relatedTable: string,
  relatedRecordId: string
): Promise<{ count: number; overdue: number; error: string | null }> {
  const supabase: AnyClient = await createClient();

  const today = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('chatter_messages')
    .select('message_id, activity_due_date')
    .eq('related_table', relatedTable)
    .eq('related_record_id', relatedRecordId)
    .eq('type', 'activity')
    .eq('activity_done', false);

  if (error) return { count: 0, overdue: 0, error: error.message };

  const count   = data?.length ?? 0;
  const overdue = (data ?? []).filter((a: { activity_due_date: string | null }) =>
    a.activity_due_date && a.activity_due_date < today
  ).length ?? 0;

  return { count, overdue, error: null };
}
