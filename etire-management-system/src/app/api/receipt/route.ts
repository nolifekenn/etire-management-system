import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/tokenServer";
import { receiptGenerator } from "@/lib/receiptGenerator";

export async function POST(req: Request) {
  // 1️⃣ Verify user token
  const { valid, user, error } = await verifyAuthToken(req);
  if (!valid) return NextResponse.json({ error }, { status: 401 });

  try {
    // 2️⃣ Parse request body
    const { saleId, saleData, cartItems } = await req.json();
    if (!saleId || !saleData || !cartItems) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 3️⃣ Generate and store receipt
    const result = await receiptGenerator.generateCompleteReceipt(saleId, saleData, cartItems);

    // 4️⃣ Return receipt details
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("Receipt generation failed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
