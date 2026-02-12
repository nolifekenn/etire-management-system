import { NextResponse } from "next/server";
import { supabaseUntyped as supabase } from "@/lib/supabaseClient";

// GET all inventory items
export async function GET() {
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const { data, error } = await supabase.from("inventory").select("*");
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}

// POST new inventory entry
export async function POST(req: Request) {
  if (!supabase) return NextResponse.json({ error: "Database not configured" }, { status: 500 });
  const item = await req.json();
  const { error } = await supabase.from("inventory").insert(item);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}
