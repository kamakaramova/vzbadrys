import { NextRequest, NextResponse } from "next/server";

import { getOzonConfig, verifyNotificationSignature } from "@/lib/ozonAcquiring";
import { getServerSupabase } from "@/lib/supabaseServer";
import { applyOzonPaymentStatus } from "@/lib/ozonPaymentStatus";

export const runtime = "nodejs";

interface OzonNotification {
  orderID?: string;
  orderId?: string;
  extOrderID?: string;
  extOrderId?: string;
  transactionID?: number | string | null;
  transactionId?: number | string | null;
  transactionUid?: string;
  transactionUID?: string;
  amount?: number | string;
  currencyCode?: string;
  testMode?: number;
  status?: "Completed" | "Rejected" | "Authorized" | string;
  operationType?: string;
  paymentMethod?: string;
  requestSign?: string;
}

export async function POST(request: NextRequest) {
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let config: ReturnType<typeof getOzonConfig>;
  try {
    config = getOzonConfig();
  } catch {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }
  if (!config.notificationSecret) {
    return NextResponse.json({ error: "notification_secret_missing" }, { status: 503 });
  }

  let body: OzonNotification;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  const orderId = body.orderID || body.orderId || "";
  const extOrderId = body.extOrderID || body.extOrderId || "";
  const transactionValue = body.transactionID ?? body.transactionId;
  const transactionId = transactionValue != null
    ? String(transactionValue)
    : body.transactionUid || body.transactionUID || "";
  const amount = Number(body.amount);
  const currencyCode = body.currencyCode || "";
  const receivedSign = body.requestSign || "";

  if (!orderId || !Number.isInteger(amount)) {
    console.warn("Ozon payment notification rejected: invalid payload shape");
    return NextResponse.json({ error: "invalid_notification" }, { status: 400 });
  }
  const signatureIsValid = verifyNotificationSignature({
    received: receivedSign,
    accessKey: config.accessKey,
    orderId,
    transactionId,
    extOrderId,
    amount: amount as number,
    currencyCode,
    notificationSecret: config.notificationSecret,
  });
  if (!signatureIsValid) {
    console.warn("Ozon payment notification rejected: invalid signature");
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const result = await applyOzonPaymentStatus({
    db,
    ozonOrderId: orderId,
    externalOrderId: extOrderId || undefined,
    status: body.status || "",
    transactionId,
    paymentMethod: body.paymentMethod,
    isTest: body.testMode === 1,
    expectedAmount: amount,
    expectedCurrency: currencyCode,
  });
  if (!result.ok) {
    console.warn(`Ozon payment notification could not be applied: ${result.error}`);
    return NextResponse.json({ error: result.error }, { status: 409 });
  }
  console.info(`Ozon payment notification applied: status=${String(body.status || "unknown")}, changed=${result.changed}`);
  return NextResponse.json(result);
}
