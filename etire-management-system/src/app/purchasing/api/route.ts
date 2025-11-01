import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET all suppliers or purchase orders
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "purchase-orders") {
    const { data, error } = await supabase
      .from("purchase_order")
      .select(`
        *,
        supplier:supplier_id(name),
        branch:branch_id(name),
        user:user_id(name)
      `)
      .order("order_date", { ascending: false });
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json(data);
  }

  // Default to suppliers
  const { data, error } = await supabase.from("supplier").select("*");
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}

// POST new supplier or purchase order
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const body = await req.json();

  if (type === "purchase-orders") {
    const { error } = await supabase.from("purchase_order").insert(body);
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Default to supplier
  const { error } = await supabase.from("supplier").insert(body);
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH update supplier or purchase order
export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const body = await req.json();

  console.log('PATCH Request - Type:', type);
  console.log('PATCH Request - Body:', body);

  if (type === "purchase-orders") {
    const { po_id, ...updates } = body;
    if (!po_id) return NextResponse.json({ error: { message: "po_id is required" } }, { status: 400 });
    
    console.log('PATCH PO - ID:', po_id);
    console.log('PATCH PO - Updates:', updates);
    
    const { data, error } = await supabase
      .from("purchase_order")
      .update(updates)
      .eq("po_id", po_id)
      .select();
    
    console.log('PATCH PO - Data:', data);
    console.log('PATCH PO - Error:', error);
    
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Default to supplier
  const { supplier_id, ...updates } = body;
  if (!supplier_id) return NextResponse.json({ error: { message: "supplier_id is required" } }, { status: 400 });
  
  const { data, error } = await supabase
    .from("supplier")
    .update(updates)
    .eq("supplier_id", supplier_id)
    .select();
  
  console.log('PATCH Supplier - Error:', error);
  
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE supplier or purchase order
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "purchase-orders") {
    const po_id = searchParams.get("po_id");
    if (!po_id) return NextResponse.json({ error: { message: "po_id is required" } }, { status: 400 });
    
    const { error } = await supabase
      .from("purchase_order")
      .delete()
      .eq("po_id", po_id);
    
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Default to supplier
  const supplier_id = searchParams.get("supplier_id");
  if (!supplier_id) return NextResponse.json({ error: { message: "supplier_id is required" } }, { status: 400 });
  
  const { error } = await supabase
    .from("supplier")
    .delete()
    .eq("supplier_id", supplier_id);
  
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}
