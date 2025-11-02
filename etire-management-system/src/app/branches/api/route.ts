import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET all branches
export async function GET() {
  const { data, error } = await supabase
    .from("branch")
    .select(`
      *,
      manager:manager_id(user_id, name)
    `)
    .order("name", { ascending: true });
  
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}

// POST new branch
export async function POST(req: Request) {
  const body = await req.json();
  
  const { error } = await supabase
    .from("branch")
    .insert(body)
    .select();
  
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH update branch
export async function PATCH(req: Request) {
  const { branch_id, ...updates } = await req.json();
  
  if (!branch_id) {
    return NextResponse.json(
      { error: { message: "branch_id is required" } },
      { status: 400 }
    );
  }
  
  const { error } = await supabase
    .from("branch")
    .update(updates)
    .eq("branch_id", branch_id)
    .select();
  
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE branch
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const branch_id = searchParams.get("branch_id");
  
  if (!branch_id) {
    return NextResponse.json(
      { error: { message: "branch_id is required" } },
      { status: 400 }
    );
  }
  
  const { error } = await supabase
    .from("branch")
    .delete()
    .eq("branch_id", branch_id);
  
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}