import { NextRequest, NextResponse } from "next/server";

import { getOzonOrderStatus } from "@/lib/ozonAcquiring";
import { applyOzonPaymentStatus } from "@/lib/ozonPaymentStatus";
import { getServerSupabase } from "@/lib/supabaseServer";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const PENDING_STATUSES = ["creating", "awaiting_payment", "authorized", "processing_payment"];

function safeOzonError(error: unknown) {
  const message = error instanceof Error ? error.message : "Ozon не дал статус";
  return message.replace(/[a-f0-9]{32,}/gi, "[скрыто]").slice(0, 240);
}

function isAuthorized(request: NextRequest) {
  return Boolean(ADMIN_PASSWORD && request.headers.get("x-admin-password") === ADMIN_PASSWORD);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data, error } = await db
    .from("payment_orders")
    .select("id,ozon_order_id,status")
    .in("status", PENDING_STATUSES)
    .not("ozon_order_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let checked = 0;
  let changed = 0;
  const problems: string[] = [];
  for (const order of data ?? []) {
    const ozonOrderId = String(order.ozon_order_id || "");
    if (!ozonOrderId) continue;
    try {
      const ozon = await getOzonOrderStatus(ozonOrderId);
      const result = await applyOzonPaymentStatus({
        db,
        ozonOrderId,
        externalOrderId: String(order.id),
        status: ozon.status,
        paymentMethod: ozon.paymentMethod,
        isTest: ozon.isTest,
      });
      checked += 1;
      if (!result.ok) problems.push(`${order.id}: ${result.error}`);
      else if (result.changed) changed += 1;
    } catch (error) {
      const message = safeOzonError(error);
      console.warn(`Ozon payment status sync failed: ${message}`);
      problems.push(`${order.id}: ${message}`);
    }
  }

  return NextResponse.json({ checked, changed, problems });
}
