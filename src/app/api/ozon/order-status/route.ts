import { NextRequest, NextResponse } from "next/server";

import { getOzonOrderStatus } from "@/lib/ozonAcquiring";
import { applyOzonPaymentStatus } from "@/lib/ozonPaymentStatus";
import { getServerSupabase } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order") || "";
  if (!/^VZB-\d{8}-[A-F0-9]{8}$/.test(orderId)) {
    return NextResponse.json({ error: "bad_order" }, { status: 400 });
  }
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data, error } = await db
    .from("payment_orders")
    .select("id, status, is_test, paid_at, ozon_order_id")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Редирект из Ozon часто приходит раньше webhook. Сверяем статус напрямую,
  // чтобы оплаченный или отменённый заказ не оставался в ожидании.
  if (data.ozon_order_id && ["creating", "awaiting_payment", "authorized", "processing_payment"].includes(String(data.status))) {
    try {
      const ozon = await getOzonOrderStatus(String(data.ozon_order_id));
      await applyOzonPaymentStatus({
        db,
        ozonOrderId: String(data.ozon_order_id),
        externalOrderId: data.id,
        status: ozon.status,
        paymentMethod: ozon.paymentMethod,
        isTest: ozon.isTest,
      });
    } catch {
      // Если Ozon ещё обрабатывает платёж, отдаём последнее сохранённое состояние.
    }
  }

  const { data: current, error: currentError } = await db
    .from("payment_orders")
    .select("id, status, is_test, paid_at")
    .eq("id", orderId)
    .maybeSingle();
  if (currentError || !current) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    orderId: current.id,
    status: current.status,
    isTest: current.is_test,
    paidAt: current.paid_at,
  });
}
