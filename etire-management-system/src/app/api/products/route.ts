import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET all products
export async function GET() {
  const { data, error } = await supabase.from("products").select("*");
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}

// POST create new product
export async function POST(req: Request) {
  const product = await req.json();
  const { error } = await supabase.from("products").insert(product);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}
