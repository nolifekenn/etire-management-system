import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabaseServer";

const PIN_REGEX = /^\d{6}$/;

interface ChangePinBody {
  pin?: string;
}

interface RequesterRecord {
  user_id: string;
  role: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { pin } = (await request.json()) as ChangePinBody;
    const normalizedPin = String(pin || "").trim();

    if (!PIN_REGEX.test(normalizedPin)) {
      return NextResponse.json(
        { success: false, error: "PIN must be exactly 6 numeric digits." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: requester, error: requesterError } = await adminClient
      .from("user")
      .select("user_id, role")
      .eq("auth_id", user.id)
      .is("deleted_at", null)
      .maybeSingle<RequesterRecord>();

    if (requesterError || !requester) {
      return NextResponse.json({ success: false, error: "Could not verify current user." }, { status: 401 });
    }

    if (requester.role !== "branch_manager") {
      return NextResponse.json(
        { success: false, error: "Only branch managers can update manager PIN from this section." },
        { status: 403 }
      );
    }

    const { error: updateError } = await (adminClient
      .from("user") as any)
      .update({ pin: normalizedPin })
      .eq("user_id", requester.user_id)
      .eq("role", "branch_manager")
      .is("deleted_at", null);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[change-manager-pin] unexpected error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred." }, { status: 500 });
  }
}
