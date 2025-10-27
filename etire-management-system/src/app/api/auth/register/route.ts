import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

export async function POST(req: Request) {
  try {
    const { username, password, firstName, lastName } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const email = `${username}@etire.com`;

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Insert user record
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

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Registration error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
