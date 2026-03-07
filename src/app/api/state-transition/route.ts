/**
 * POST /api/state-transition
 * --------------------------
 * Unified endpoint for all ERP document state transitions.
 * Body: { model, recordId, nextState, userId, note? }
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  transitionPurchaseOrder,
  transitionServiceJob,
  POState,
  ServiceState,
} from '@/lib/stateTransitions';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { model, recordId, nextState, userId, note } = body;

    if (!model || !recordId || !nextState || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: model, recordId, nextState, userId' },
        { status: 400 }
      );
    }

    switch (model) {
      case 'purchase_order': {
        const result = await transitionPurchaseOrder(recordId, nextState as POState, userId, note);
        return NextResponse.json(result, { status: result.success ? 200 : 422 });
      }

      case 'service_job': {
        const result = await transitionServiceJob(recordId, nextState as ServiceState, userId, note);
        return NextResponse.json(result, { status: result.success ? 200 : 422 });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown model: ${model}` },
          { status: 400 }
        );
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json(
      { success: false, error: msg },
      { status: 500 }
    );
  }
}
