// app/api/auth/route.ts
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

/**
 * API Route: /api/auth
 * Supports `action: "register"` and `action: "login"`
 * Allows login via username or email
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { action, email, password, firstName, lastName, username } = body;

    if (!action || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // ========================================================
    // 🔹 REGISTER USER
    // ========================================================
    if (action === "register") {
      if (!email || !username) {
        return NextResponse.json({ error: "Email and username required" }, { status: 400 });
      }

      // 1️⃣ Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error("Auth signUp error:", authError);
        return NextResponse.json({ error: authError.message }, { status: 400 });
      }

      const supabaseUser = authData.user;
      if (!supabaseUser) {
        return NextResponse.json({ error: "Failed to create Supabase user" }, { status: 500 });
      }

      // 2️⃣ Insert into public.user
      const { data: profile, error: profileError } = await supabase
        .from("user")
        .insert([
          {
            user_id: crypto.randomUUID(),
            uuid: supabaseUser.id,
            name: `${firstName ?? ""} ${lastName ?? ""}`.trim(),
            username,
            role: 0, // Guest by default
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (profileError) {
        console.error("Profile insert error:", profileError);
        return NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: "User registered successfully",
        user: profile,
      });
    }

    // ========================================================
    // 🔹 LOGIN USER (username or email)
    // ========================================================
    if (action === "login") {
      // 🟣 If email is missing, try lookup by username
      if (!email && username) {
        const { data: userRecord, error: lookupError } = await supabase
          .from("user")
          .select("uuid")
          .eq("username", username)
          .single();

        if (lookupError || !userRecord) {
          return NextResponse.json({ error: "Invalid username" }, { status: 401 });
        }

        // Find email associated with this Supabase Auth user
        const { data: authUser, error: emailLookupError } = await supabase
          .from("auth.users")
          .select("email")
          .eq("id", userRecord.uuid)
          .single();

        if (emailLookupError || !authUser?.email) {
          return NextResponse.json({ error: "Email not found for username" }, { status: 404 });
        }

        email = authUser.email;
      }

      // 2️⃣ Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.user) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }

      // 3️⃣ Fetch user profile
      const { data: profile, error: profileError } = await supabase
        .from("user")
        .select("user_id, name, username, role")
        .eq("uuid", authData.user.id)
        .single();

      if (profileError || !profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        message: "Login successful",
        user: profile,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("🚨 Auth route error:", error);
    return NextResponse.json(
      { error: error.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
