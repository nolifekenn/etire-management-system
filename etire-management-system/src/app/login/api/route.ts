import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, username, password, firstName, lastName } = body;

    if (!action || !username || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const email = `${username}@etire.com`;

    // 🔹 Registration flow
    if (action === "register") {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      const { error: insertError } = await supabase.from("users").insert([
        {
          auth_id: authData.user?.id,
          username,
          email,
          full_name: `${firstName} ${lastName}`,
          role: 1,
          is_active: true,
        },
      ]);

      if (insertError) throw insertError;

      return NextResponse.json({ success: true, message: "User registered successfully" });
    }

    // 🔹 Login flow
    if (action === "login") {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return NextResponse.json({ success: true, user: data.user });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Auth error:", error);
    return NextResponse.json({ error: error.message || "Unknown error" }, { status: 500 });
  }
}
