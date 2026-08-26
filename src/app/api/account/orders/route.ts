import { NextRequest, NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabaseServer";
import { deliveryMethodLabel, paymentMethodLabel } from "@/lib/orderLabels";

const ORDER_STATUSES = new Set(["processing", "confirmed", "shipped", "ready_for_pickup", "delivered", "cancelled"]);

function mapOrder(row: Record<string, unknown>) {
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
  const rawStatus = String(delivery.orderStatus ?? "");
  const paymentStatus = String(row.status ?? "");
  const status = ORDER_STATUSES.has(rawStatus)
    ? rawStatus
    : ["payment_failed", "creation_failed", "payment_processing_error"].includes(paymentStatus)
      ? "cancelled"
      : "processing";

  return {
    id: String(row.id),
    date: String(row.created_at),
    status,
    items,
    subtotal,
    discount,
    deliveryCost,
    total,
    promoCode: row.promo_code ? String(row.promo_code) : undefined,
    deliveryMethod: deliveryMethodLabel(delivery.method),
    deliveryAddress: [delivery.region, delivery.city, delivery.address].filter(Boolean).join(", "),
    paymentMethod: paymentMethodLabel(row.payment_method),
    paymentStatus,
    paidAt: row.paid_at ? String(row.paid_at) : undefined,
    comment: row.comment ? String(row.comment) : undefined,
    trackNumber: delivery.trackNumber ? String(delivery.trackNumber) : undefined,
  };
}

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { data: authData, error: authError } = await db.auth.getUser(token);
  if (authError || !authData.user?.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const user = authData.user;
  const email = authData.user.email!.toLowerCase();
  const [byUser, byEmail, unlinked] = await Promise.all([
    db.from("payment_orders").select("*").eq("user_id", user.id),
    db.from("payment_orders").select("*").eq("customer->>email", email),
    // Старые заказы могли быть сделаны до входа в аккаунт и храниться без user_id.
    // Сверяем их только с подтверждённой почтой текущего пользователя на сервере.
    db.from("payment_orders").select("*").is("user_id", null),
  ]);
  if (byUser.error || byEmail.error || unlinked.error) {
    return NextResponse.json(
      { error: byUser.error?.message || byEmail.error?.message || unlinked.error?.message },
      { status: 500 }
    );
  }

  const matchingUnlinked = (unlinked.data ?? []).filter((row) => {
    const customer = (row.customer ?? {}) as Record<string, unknown>;
    return String(customer.email ?? "").trim().toLowerCase() === email;
  });

  const rows = new Map<string, Record<string, unknown>>();
  for (const row of [...(byUser.data ?? []), ...(byEmail.data ?? []), ...matchingUnlinked]) {
    rows.set(String(row.id), row as Record<string, unknown>);
  }

  const emailOrderIds = [...(byEmail.data ?? []), ...matchingUnlinked]
    .filter((row) => !row.user_id)
    .map((row) => row.id);
  if (emailOrderIds.length) {
    await db.from("payment_orders").update({ user_id: user.id }).in("id", emailOrderIds);
  }

  const orders = [...rows.values()]
    .sort((a, b) => new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime())
    .map(mapOrder);
  return NextResponse.json({ orders });
}
