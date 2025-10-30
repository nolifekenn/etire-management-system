import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET all suppliers
export async function GET() {
  const { data, error } = await supabase.from("supplier").select("*");
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}

// POST new supplier entry
export async function POST(req: Request) {
  const supplier = await req.json();
  const { error } = await supabase.from("supplier").insert(supplier);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH update supplier
export async function PATCH(req: Request) {
  const { supplier_id, ...updates } = await req.json();
  if (!supplier_id) return NextResponse.json({ error: { message: "supplier_id is required" } }, { status: 400 });
  
  const { error } = await supabase
    .from("supplier")
    .update(updates)
    .eq("supplier_id", supplier_id);
  
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE supplier
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const supplier_id = searchParams.get("supplier_id");
  
  if (!supplier_id) return NextResponse.json({ error: { message: "supplier_id is required" } }, { status: 400 });
  
  const { error } = await supabase
    .from("supplier")
    .delete()
    .eq("supplier_id", supplier_id);
  
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}