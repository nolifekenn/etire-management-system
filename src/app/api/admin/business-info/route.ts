import { NextRequest, NextResponse } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabaseServer";

const BUSINESS_SETTING_KEYS = [
  "business_name",
  "business_tin",
  "vat_label",
  "atp_number",
  "printer_name",
  "printer_address",
  "printer_tin",
  "serial_range",
  "receipt_type_label",
  "vat_inclusive_note",
] as const;

type BusinessSettingsPayload = Record<(typeof BUSINESS_SETTING_KEYS)[number], string>;

interface AdminProfile {
  user_id: string;
  role: string;
}

const DEFAULT_SETTINGS: BusinessSettingsPayload = {
  business_name: "Queen.R Tire Supply & Vulcanizing Shop",
  business_tin: "193-953-192-000",
  vat_label: "VAT Registered",
  atp_number: "ATP-000000000000",
  printer_name: "TUP-M BSIS-4A 25-26 Team",
  printer_address: "Ayala Blvd., corner San Marcelino St., Ermita, Manila 1000, Metro Manila, Philippines",
  printer_tin: "000-000-000-000",
  serial_range: "000001-000500",
  receipt_type_label: "SALES INVOICE",
  vat_inclusive_note: "Prices shown are VAT-inclusive.",
};

async function verifySuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { ok: false as const, error: "Unauthorized", status: 401 };
  }

  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from("user")
    .select("user_id, role")
    .eq("auth_id", user.id)
    .is("deleted_at", null)
    .maybeSingle<AdminProfile>();

  if (profileError || !profile) {
    return { ok: false as const, error: "Could not verify current user", status: 401 };
  }

  if (profile.role !== "super_admin") {
    return { ok: false as const, error: "Insufficient permissions", status: 403 };
  }

  return { ok: true as const, userId: profile.user_id as string };
}

export async function GET(_request: NextRequest) {
  const verification = await verifySuperAdmin();
  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: verification.status });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("system_settings")
    .select("key, value")
    .in("key", [...BUSINESS_SETTING_KEYS]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const settings: BusinessSettingsPayload = { ...DEFAULT_SETTINGS };
  for (const row of data ?? []) {
    const key = String(row.key) as keyof BusinessSettingsPayload;
    if (key in settings) {
      settings[key] = String(row.value ?? "");
    }
  }

  return NextResponse.json({ data: settings });
}

export async function PUT(request: NextRequest) {
  const verification = await verifySuperAdmin();
  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: verification.status });
  }

  const body = (await request.json()) as Partial<BusinessSettingsPayload>;
  const upsertRows = BUSINESS_SETTING_KEYS.map((key) => ({
    key,
    value: String(body[key] ?? "").trim(),
    updated_by: verification.userId,
    updated_at: new Date().toISOString(),
  }));

  const adminClient = createAdminClient();
  const { error } = await adminClient
    .from("system_settings")
    .upsert(upsertRows, { onConflict: "key" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
