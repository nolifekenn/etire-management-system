/**
 * GET  /api/chatter?table=purchase_order&id=<uuid>
 * POST /api/chatter  — add a note or activity
 * PATCH /api/chatter?id=<messageId> — mark activity as done
 */

import { NextRequest, NextResponse } from 'next/server';
import { addNote, getChatter, scheduleActivity, markActivityDone } from '@/lib/chatter';

// GET — fetch chatter for a record
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const table     = searchParams.get('table');
  const recordId  = searchParams.get('id');
  const limitStr  = searchParams.get('limit');

  if (!table || !recordId) {
    return NextResponse.json({ error: 'Missing table and id query params' }, { status: 400 });
  }

  const limit = limitStr ? parseInt(limitStr, 10) : 50;
  const { messages, error } = await getChatter(table, recordId, limit);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ messages });
}

// POST — add a note or schedule an activity
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type = 'note', relatedTable, relatedRecordId, userId, message, isInternal,
            activityType, dueDate, attachments } = body;

    if (!relatedTable || !relatedRecordId || !userId || !message) {
      return NextResponse.json(
        { error: 'Missing: relatedTable, relatedRecordId, userId, message' },
        { status: 400 }
      );
    }

    if (type === 'activity') {
      if (!activityType || !dueDate) {
        return NextResponse.json(
          { error: 'Activity requires: activityType, dueDate' },
          { status: 400 }
        );
      }
      const result = await scheduleActivity({
        relatedTable, relatedRecordId, userId, activityType, message, dueDate,
      });
      if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
      return NextResponse.json({ id: result.id }, { status: 201 });
    }

    // Default: add note
    const result = await addNote({
      relatedTable, relatedRecordId, userId, message, isInternal, attachments,
    });

    if (result.error) return NextResponse.json({ error: result.error }, { status: 500 });
    return NextResponse.json({ id: result.id }, { status: 201 });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// PATCH — mark an activity as done
export async function PATCH(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const messageId = searchParams.get('id');

  if (!messageId) {
    return NextResponse.json({ error: 'Missing ?id= query param' }, { status: 400 });
  }

  const { error } = await markActivityDone(messageId);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}
