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

interface SystemSettingRow {
  key: string;
  value: string | null;
}

const DEFAULT_SETTINGS: BusinessSettingsPayload = {
  business_name: "",
  business_tin: "",
  vat_label: "VAT Registered",
  atp_number: "",
  printer_name: "TUP-M BSIS-4A 25-26 Team",
  printer_address: "Ayala Blvd., corner San Marcelino St., Ermita, Manila 1000, Metro Manila, Philippines",
  printer_tin: "",
  serial_range: "",
  receipt_type_label: "SALES INVOICE",
  vat_inclusive_note: "Prices shown are VAT-inclusive.",
};

export async function GET(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();
  const { data, error } = await adminClient
    .from("system_settings")
    .select("key, value")
    .in("key", [...BUSINESS_SETTING_KEYS])
    .returns<SystemSettingRow[]>();

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
