import { NextRequest, NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabaseServer";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const ORDER_STATUSES = new Set(["processing", "confirmed", "shipped", "delivered", "cancelled"]);

function isAuthorized(request: NextRequest) {
  return Boolean(ADMIN_PASSWORD && request.headers.get("x-admin-password") === ADMIN_PASSWORD);
}

function mapOrder(row: Record<string, unknown>) {
  const customer = (row.customer ?? {}) as Record<string, string>;
  const delivery = (row.delivery ?? {}) as Record<string, unknown>;
  const items = ((row.items ?? []) as Record<string, unknown>[]).map((item) => ({
    id: String(item.cartId ?? item.productId ?? ""),
    name: String(item.name ?? "Товар"),
    price: Number(item.unitPrice ?? 0),
    quantity: Number(item.quantity ?? 1),
    category: String(item.category ?? ""),
  }));
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryCost = Number(delivery.price ?? 0);
  const total = Number(row.amount_kopecks ?? 0) / 100;
  const discount = Math.max(0, subtotal + deliveryCost - total);
  const promoDiscountPercent = row.promo_code && subtotal > 0
    ? Number(delivery.promoPercent ?? Math.round((discount / subtotal) * 100))
    : undefined;
  const rawOrderStatus = String(delivery.orderStatus ?? "");
  const paymentStatus = String(row.status ?? "");
  const status = ORDER_STATUSES.has(rawOrderStatus)
    ? rawOrderStatus
    : paymentStatus === "payment_failed" || paymentStatus === "creation_failed"
      ? "cancelled"
      : "processing";

  return {
    id: String(row.id),
    date: String(row.created_at ?? new Date().toISOString()),
    status,
    items,
    subtotal,
    discount,
    deliveryCost,
    total,
    promoCode: row.promo_code ? String(row.promo_code) : undefined,
    promoDiscountPercent,
    deliveryMethod: String(delivery.method ?? ""),
    deliveryAddress: [delivery.city, delivery.address].filter(Boolean).join(", "),
    paymentMethod: row.payment_method ? String(row.payment_method) : "Ozon Pay",
    paymentStatus,
    paidAt: row.paid_at ? String(row.paid_at) : undefined,
    stockWrittenOff: Boolean(row.stock_written_off),
    isTest: Boolean(row.is_test),
    comment: row.comment ? String(row.comment) : undefined,
    trackNumber: delivery.trackNumber ? String(delivery.trackNumber) : undefined,
    userId: row.user_id ? String(row.user_id) : undefined,
    userName: [customer.name, customer.surname].filter(Boolean).join(" "),
    userEmail: customer.email ?? "",
    userPhone: customer.phone ?? "",
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data, error } = await db
    .from("payment_orders")
    .select("id,status,amount_kopecks,customer,items,delivery,promo_code,comment,user_id,payment_method,is_test,stock_written_off,paid_at,created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ orders: (data ?? []).map((row) => mapOrder(row)) });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let body: { orderId?: string; status?: string; trackNumber?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body.orderId || !body.status || !ORDER_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const { data: current, error: readError } = await db
    .from("payment_orders")
    .select("delivery")
    .eq("id", body.orderId)
    .maybeSingle();
  if (readError || !current) {
    return NextResponse.json({ error: readError?.message ?? "order_not_found" }, { status: 404 });
  }

  const delivery = (current.delivery ?? {}) as Record<string, unknown>;
  const { error } = await db
    .from("payment_orders")
    .update({
      delivery: {
        ...delivery,
        orderStatus: body.status,
        trackNumber: body.trackNumber?.trim() || null,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.orderId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
