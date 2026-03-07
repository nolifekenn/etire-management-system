import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabaseServer";
import { loginRateLimiter } from "@/lib/rateLimit";

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
  password: string | null;
}

const EMAIL_DOMAIN = "etire-system.local";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  const peek = loginRateLimiter.peek(ip);
  if (!peek.allowed) {
    const retryAfterSec = Math.ceil((peek.resetAt - Date.now()) / 1000);
    return NextResponse.json(
      {
        success: false,
        message: `Too many failed login attempts. Please try again in ${Math.ceil(retryAfterSec / 60)} minute(s).`,
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": "5",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const { username, password } = (await request.json()) as VerifyRequestBody;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: "Username and password are required." },
        { status: 400 }
      );
    }

    const adminClient = createAdminClient();

    // ── Step 1: Look up user by username + verify password against DB ──────
    // The DB password column is the source of truth (plaintext).
    // We validate here, then sync to Supabase Auth so signInWithPassword works.
    const { data: userRecord, error: userError } = await adminClient
      .from("user")
      .select("user_id, username, name, auth_id, role, branch_id, password")
      .eq("username", username)
      .is("deleted_at", null)
      .maybeSingle<UserRecord>();

    if (userError) {
      console.error("[verify-credentials] Failed to query user table:", userError);
      return NextResponse.json(
        { success: false, message: "Unable to verify credentials." },
        { status: 500 }
      );
    }

    // Unknown username — consume a rate-limit slot
    if (!userRecord) {
      loginRateLimiter.check(ip);
      return NextResponse.json(
        { success: false, message: "Invalid username or password." },
        { status: 401 }
      );
    }

    // Wrong password — consume a rate-limit slot
    if (!userRecord.password || userRecord.password !== password) {
      const result = loginRateLimiter.check(ip);
      return NextResponse.json(
        { success: false, message: "Invalid username or password." },
        {
          status: 401,
          headers: { "X-RateLimit-Remaining": String(result.remaining) },
        }
      );
    }

    // ── Step 2: Password is correct — ensure Supabase Auth is in sync ──────
    let authId = userRecord.auth_id;
    let authEmail: string | null = null;
    const derivedEmail = `${username}@${EMAIL_DOMAIN}`;

    if (authId) {
      const { data: authData, error: authLookupError } = await adminClient.auth.admin.getUserById(authId);

      if (!authLookupError && authData?.user?.email) {
        authEmail = authData.user.email;

        // Always sync the password so Supabase Auth matches the DB.
        // This fixes cases where the password was changed via the admin panel
        // (which updates the DB) but the Supabase Auth password wasn't updated.
        await adminClient.auth.admin.updateUserById(authId, { password }).catch((err: unknown) => {
          console.error("[verify-credentials] Password sync failed (non-fatal):", err);
        });
      } else {
        console.warn("[verify-credentials] auth_id exists but no Supabase Auth user found. Recreating.", { authId, username });
        authId = null;
      }
    }

    if (!authId) {
      // No Supabase Auth account — create one now
      const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email: derivedEmail,
        password,
        email_confirm: true,
        user_metadata: { username: userRecord.username, name: userRecord.name, role: userRecord.role },
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

      await (adminClient.from("user") as any)
        .update({ auth_id: authId })
        .eq("user_id", userRecord.user_id);
    }

    // ── Step 3: Credentials verified and Auth is synced — clear rate limit ──
    loginRateLimiter.reset(ip);

    return NextResponse.json({ success: true, email: authEmail ?? derivedEmail });

  } catch (error) {
    console.error("[verify-credentials] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}