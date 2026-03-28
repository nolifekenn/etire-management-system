import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabaseServer";

const PIN_REGEX = /^\d{6}$/;

interface VerifyPinBody {
  pin?: string;
  requiredBranchId?: string;
}

interface RequesterRecord {
  user_id: string;
  role: string;
  branch_id: string | null;
}

interface ManagerRecord {
  user_id: string;
  name: string;
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

    const { pin, requiredBranchId } = (await request.json()) as VerifyPinBody;

    const normalizedPin = String(pin || "").trim();
    const normalizedBranchId = String(requiredBranchId || "").trim();

    if (!PIN_REGEX.test(normalizedPin)) {
      return NextResponse.json({ success: false, error: "PIN must be exactly 6 numeric digits." }, { status: 400 });
    }

    if (!normalizedBranchId) {
      return NextResponse.json({ success: false, error: "Branch context is required." }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: requester, error: requesterError } = await adminClient
      .from("user")
      .select("user_id, role, branch_id")
      .eq("auth_id", user.id)
      .is("deleted_at", null)
      .maybeSingle<RequesterRecord>();

    if (requesterError || !requester) {
      return NextResponse.json({ success: false, error: "Could not verify current user." }, { status: 401 });
    }

    // Non-manager roles can only request authorization for their own branch.
    if (
      requester.role !== "super_admin" &&
      requester.role !== "branch_manager" &&
      requester.branch_id !== normalizedBranchId
    ) {
      return NextResponse.json(
        { success: false, error: "You can only request manager authorization for your branch." },
        { status: 403 }
      );
    }

    const { data: manager, error: managerError } = await adminClient
      .from("user")
      .select("user_id, name")
      .eq("role", "branch_manager")
      .eq("branch_id", normalizedBranchId)
      .eq("pin", normalizedPin)
      .is("deleted_at", null)
      .maybeSingle<ManagerRecord>();

    if (managerError) {
      console.error("[verify-manager-pin] manager query failed:", managerError);
      return NextResponse.json({ success: false, error: "Verification failed. Please try again." }, { status: 500 });
    }

    if (!manager) {
      return NextResponse.json(
        { success: false, error: "Invalid PIN or no branch manager found for this branch." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authorizedBy: {
        user_id: manager.user_id,
        name: manager.name,
      },
    });
  } catch (error) {
    console.error("[verify-manager-pin] unexpected error:", error);
    return NextResponse.json({ success: false, error: "An unexpected error occurred." }, { status: 500 });
  }
}
