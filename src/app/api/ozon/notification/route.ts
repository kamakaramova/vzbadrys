import { NextRequest, NextResponse } from "next/server";

import { getOzonConfig, verifyNotificationSignature } from "@/lib/ozonAcquiring";
import { decrementProductStock } from "@/lib/stock";
import { getServerSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

interface OzonNotification {
  orderID?: string;
  extOrderID?: string;
  transactionID?: number | null;
  transactionUid?: string;
  transactionUID?: string;
  amount?: number;
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

  const orderId = body.orderID || "";
  const extOrderId = body.extOrderID || "";
  const transactionId = body.transactionID != null
    ? String(body.transactionID)
    : body.transactionUid || body.transactionUID || "";
  const amount = body.amount;
  const currencyCode = body.currencyCode || "";
  const receivedSign = body.requestSign || "";

  if (!orderId || !Number.isInteger(amount)) {
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
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let orderQuery = db
    .from("payment_orders")
    .select("id, ozon_order_id, status, amount_kopecks, items, stock_written_off");
  orderQuery = extOrderId
    ? orderQuery.eq("id", extOrderId)
    : orderQuery.eq("ozon_order_id", orderId);
  const { data: order, error: orderError } = await orderQuery.maybeSingle();
  if (orderError || !order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  if (order.ozon_order_id && order.ozon_order_id !== orderId) {
    return NextResponse.json({ error: "order_mismatch" }, { status: 409 });
  }
  if (Number(order.amount_kopecks) !== amount || currencyCode !== "643") {
    return NextResponse.json({ error: "amount_mismatch" }, { status: 409 });
  }

  const now = new Date().toISOString();
  if (body.status === "Completed") {
    if (order.status === "paid") return NextResponse.json({ ok: true });

    // Захватываем заказ сравнением с текущим статусом. Повторное уведомление
    // не сможет одновременно списать остатки второй раз.
    const { data: claimed, error: claimError } = await db
      .from("payment_orders")
      .update({ status: "processing_payment", updated_at: now })
      .eq("id", order.id)
      .eq("status", order.status)
      .select("id")
      .maybeSingle();
    if (claimError) return NextResponse.json({ error: "claim_failed" }, { status: 500 });
    if (!claimed) return NextResponse.json({ ok: true });

    try {
      if (!order.stock_written_off) {
        const lines = (order.items ?? []) as { productId?: string; stockAmount?: number }[];
        await decrementProductStock(
          db,
          lines.map((line) => ({ id: line.productId || "", amount: Number(line.stockAmount) }))
        );
      }
      const { error: paidError } = await db.from("payment_orders").update({
        status: "paid",
        ozon_order_id: orderId,
        payment_method: body.paymentMethod || null,
        is_test: body.testMode === 1,
        stock_written_off: true,
        paid_at: now,
        updated_at: now,
      }).eq("id", order.id);
      if (paidError) throw new Error(paidError.message);
    } catch {
      await db.from("payment_orders").update({
        status: "payment_processing_error",
        updated_at: new Date().toISOString(),
      }).eq("id", order.id);
      return NextResponse.json({ error: "payment_processing_failed" }, { status: 500 });
    }
  } else if (body.status === "Rejected") {
    await db.from("payment_orders").update({
      status: "payment_failed",
      payment_method: body.paymentMethod || null,
      is_test: body.testMode === 1,
      updated_at: now,
    }).eq("id", order.id).neq("status", "paid");
  } else if (body.status === "Authorized") {
    await db.from("payment_orders").update({
      status: "authorized",
      payment_method: body.paymentMethod || null,
      is_test: body.testMode === 1,
      updated_at: now,
    }).eq("id", order.id).neq("status", "paid");
  }

  return NextResponse.json({ ok: true });
}
