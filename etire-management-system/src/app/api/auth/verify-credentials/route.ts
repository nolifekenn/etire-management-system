import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";

interface VerifyRequestBody {
  username?: string;
  password?: string;
}

interface UserRecord {
  user_id: string;
  username: string;
  name: string;
  auth_id: string | null;
  role: string;
  branch_id: string | null;
}

const EMAIL_DOMAIN = "etire-system.local";

export async function POST(request: Request) {
  try {
    const { username, password } = (await request.json()) as VerifyRequestBody;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username and password are required." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    const { data: userRecord, error: userError } = await adminClient
      .from("user")
      .select("user_id, username, name, auth_id, role, branch_id")
      .eq("username", username)
      .eq("password", password)
      .is("deleted_at", null)
      .maybeSingle<UserRecord>();

    if (userError) {
      console.error("[verify-credentials] Failed to query user table:", userError);
      return NextResponse.json(
        { success: false, message: "Unable to verify credentials." },
        { status: 500 }
      );
    }

    if (!userRecord) {
      return NextResponse.json(
        { success: false, message: "Invalid username or password." },
        { status: 401 }
      );
    }

    let authId = userRecord.auth_id;
    let authEmail: string | null = null;

    if (authId) {
      const { data: authData, error: authLookupError } = await adminClient.auth.admin.getUserById(authId);

      if (!authLookupError && authData?.user?.email) {
        authEmail = authData.user.email;
        try {
          await adminClient.auth.admin.updateUserById(authId, { password });
        } catch (passwordSyncError) {
          console.error("[verify-credentials] Failed to sync password:", passwordSyncError);
        }
      } else {
        console.warn(
          "[verify-credentials] auth_id present but Supabase Auth user not found. Will create new auth user.",
          { authId, username }
        );
        authId = null;
      }
    }

    if (!authId) {
      const derivedEmail = `${username}@${EMAIL_DOMAIN}`;
      const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email: derivedEmail,
        password,
        email_confirm: true,
        user_metadata: {
          username: userRecord.username,
          name: userRecord.name,
          role: userRecord.role,
        },
      });

      if (createError || !createdUser.user) {
        console.error("[verify-credentials] Failed to create Supabase Auth user:", createError);
        return NextResponse.json(
          { success: false, message: "Unable to prepare authentication for this account." },
          { status: 500 }
        );
      }

      authId = createdUser.user.id;
      authEmail = createdUser.user.email ?? derivedEmail;

      const { error: updateError } = await (adminClient.from("user") as any)
        .update({ auth_id: authId })
        .eq("user_id", userRecord.user_id);

      if (updateError) {
        console.error("[verify-credentials] Failed to update auth_id in user table:", updateError);
      }
    }

    if (!authEmail) {
      authEmail = `${username}@${EMAIL_DOMAIN}`;
    }

    return NextResponse.json({ success: true, email: authEmail });
  } catch (error) {
    console.error("[verify-credentials] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}