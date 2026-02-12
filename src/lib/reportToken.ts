// /lib/reportToken.ts
import crypto from "crypto";

const SECRET = process.env.REPORTS_SECRET_KEY || "";

// How long tokens are valid (30 minutes)
const TOKEN_EXPIRY_MS = 30 * 60 * 1000;

interface ReportTokenPayload {
  userId: string;
  timestamp: number;
}

// Generate signed token for the client
export function generateReportToken(userId: string): string {
  const timestamp = Date.now();
  const payload: ReportTokenPayload = { userId, timestamp };

  const payloadStr = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", SECRET)
    .update(payloadStr)
    .digest("hex");

  // token = base64(payload).signature
  const encodedPayload = Buffer.from(payloadStr).toString("base64");
  return `${encodedPayload}.${signature}`;
}

// Verify token on API routes
export function verifyReportToken(token: string): ReportTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encodedPayload, signature] = parts;
    const payloadStr = Buffer.from(encodedPayload, "base64").toString("utf8");

    const expectedSig = crypto
      .createHmac("sha256", SECRET)
      .update(payloadStr)
      .digest("hex");

    if (expectedSig !== signature) return null;

    const payload: ReportTokenPayload = JSON.parse(payloadStr);

    // Expire after TOKEN_EXPIRY_MS
    if (Date.now() - payload.timestamp > TOKEN_EXPIRY_MS) return null;

    return payload;
  } catch {
    return null;
  }
}
