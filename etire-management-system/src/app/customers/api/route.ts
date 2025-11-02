import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabaseClient";

// GET customers, vehicles, or tire history
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "vehicles") {
    const { data, error } = await supabase
      .from("vehicle")
      .select(`
        *,
        customer:customer_id(name)
      `)
      .order("plate_number", { ascending: true });
    
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json(data);
  }

  if (type === "tire-history") {
    const { data, error } = await supabase
      .from("tire_history")
      .select(`
        *,
        vehicle:vehicle_id(plate_number),
        inventory_item:item_id(name),
        user:created_by(name)
      `)
      .order("service_date", { ascending: false });
    
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json(data);
  }

  // Default to customers
  const { data, error } = await supabase
    .from("customer")
    .select(`
      *,
      vehicle(count)
    `)
    .order("name", { ascending: true });
  
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json(data);
}

// POST new customer, vehicle, or tire history
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const body = await req.json();

  if (type === "vehicles") {
    const { error } = await supabase
      .from("vehicle")
      .insert(body)
      .select();
    
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (type === "tire-history") {
    const { error } = await supabase
      .from("tire_history")
      .insert(body)
      .select();
    
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Default to customers
  const { error } = await supabase
    .from("customer")
    .insert(body)
    .select();
  
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}

// PATCH update customer, vehicle, or tire history
export async function PATCH(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const body = await req.json();

  if (type === "vehicles") {
    const { vehicle_id, ...updates } = body;
    if (!vehicle_id) {
      return NextResponse.json(
        { error: { message: "vehicle_id is required" } },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from("vehicle")
      .update(updates)
      .eq("vehicle_id", vehicle_id)
      .select();
    
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (type === "tire-history") {
    const { history_id, ...updates } = body;
    if (!history_id) {
      return NextResponse.json(
        { error: { message: "history_id is required" } },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from("tire_history")
      .update(updates)
      .eq("history_id", history_id)
      .select();
    
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Default to customers
  const { customer_id, ...updates } = body;
  if (!customer_id) {
    return NextResponse.json(
      { error: { message: "customer_id is required" } },
      { status: 400 }
    );
  }
  
  const { error } = await supabase
    .from("customer")
    .update(updates)
    .eq("customer_id", customer_id)
    .select();
  
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}

// DELETE customer, vehicle, or tire history
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  if (type === "vehicles") {
    const vehicle_id = searchParams.get("vehicle_id");
    if (!vehicle_id) {
      return NextResponse.json(
        { error: { message: "vehicle_id is required" } },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from("vehicle")
      .delete()
      .eq("vehicle_id", vehicle_id);
    
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  if (type === "tire-history") {
    const history_id = searchParams.get("history_id");
    if (!history_id) {
      return NextResponse.json(
        { error: { message: "history_id is required" } },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from("tire_history")
      .delete()
      .eq("history_id", history_id);
    
    if (error) return NextResponse.json({ error }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  // Default to customers
  const customer_id = searchParams.get("customer_id");
  if (!customer_id) {
    return NextResponse.json(
      { error: { message: "customer_id is required" } },
      { status: 400 }
    );
  }
  
  const { error } = await supabase
    .from("customer")
    .delete()
    .eq("customer_id", customer_id);
  
  if (error) return NextResponse.json({ error }, { status: 500 });
  return NextResponse.json({ success: true });
}