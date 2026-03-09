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
}

const EMAIL_DOMAIN = "etire-system.local";

/** Extract the best available IP from request headers (works behind proxies/Vercel). */
function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // ── Brute-force protection ─────────────────────────────────────────────────
  // Peek at the current state without consuming a slot yet.
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
      // Record the failed attempt for this IP
      const result = loginRateLimiter.check(ip);
      return NextResponse.json(
        { success: false, message: "Invalid username or password." },
        {
          status: 401,
          headers: {
            "X-RateLimit-Limit": "5",
            "X-RateLimit-Remaining": String(result.remaining),
          },
        }
      );
    }

    let authId = userRecord.auth_id;
    let authEmail: string | null = null;

    if (authId) {
      const { data: authData, error: authLookupError } = await adminClient.auth.admin.getUserById(authId);

      if (!authLookupError && authData?.user?.email) {
        authEmail = authData.user.email;
        // Fire-and-forget: sync the password in the background without blocking the response
        adminClient.auth.admin.updateUserById(authId, { password }).catch((passwordSyncError: unknown) => {
          console.error("[verify-credentials] Failed to sync password:", passwordSyncError);
        });
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Successful authentication — clear the failed-attempt counter for this IP
    loginRateLimiter.reset(ip);

    return NextResponse.json({ success: true, email: authEmail });
  } catch (error) {
    console.error("[verify-credentials] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}