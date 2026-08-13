import { NextRequest, NextResponse } from "next/server";

import { deliveryMethodLabel } from "@/lib/orderLabels";
import { getServerSupabase } from "@/lib/supabaseServer";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

type WarehouseData = {
  actualDeliveryCost?: number | null;
  dispatchPoint?: string;
  internalComment?: string;
  orderChecked?: boolean;
  assembled?: boolean;
  fiscalReceiptDone?: boolean;
  honestSignDone?: boolean;
  batchesAssigned?: boolean;
  handedToDelivery?: boolean;
  updatedAt?: string;
  history?: Array<{ at: string; changes: Record<string, { from: unknown; to: unknown }> }>;
};

const BOOLEAN_FIELDS = new Set([
  "orderChecked", "assembled", "fiscalReceiptDone", "honestSignDone",
  "batchesAssigned", "handedToDelivery",
]);
const TEXT_FIELDS = new Set(["dispatchPoint", "internalComment"]);

function isAuthorized(request: NextRequest) {
  return Boolean(ADMIN_PASSWORD && request.headers.get("x-admin-password") === ADMIN_PASSWORD);
}

function mapShipment(row: Record<string, unknown>) {
  const customer = (row.customer ?? {}) as Record<string, string>;
  const delivery = (row.delivery ?? {}) as Record<string, unknown>;
  const warehouse = (delivery.warehouse ?? {}) as WarehouseData;
  const items = ((row.items ?? []) as Record<string, unknown>[]).map((item) => ({
    id: String(item.cartId ?? item.productId ?? ""),
    name: String(item.name ?? "Товар"),
    quantity: Number(item.quantity ?? 1),
  }));
  return {
    id: String(row.id),
    createdAt: String(row.created_at ?? ""),
    updatedAt: String(row.updated_at ?? row.created_at ?? ""),
    paymentStatus: String(row.status ?? ""),
    orderStatus: String(delivery.orderStatus ?? "processing"),
    customerName: [customer.name, customer.surname].filter(Boolean).join(" "),
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    items,
    itemsCount: items.reduce((sum, item) => sum + item.quantity, 0),
    total: Number(row.amount_kopecks ?? 0) / 100,
    deliveryMethod: deliveryMethodLabel(delivery.method),
    deliveryAddress: [delivery.region, delivery.city, delivery.address].filter(Boolean).join(", "),
    customerDeliveryCost: Number(delivery.price ?? 0),
    trackNumber: String(delivery.trackNumber ?? ""),
    warehouse: {
      actualDeliveryCost: warehouse.actualDeliveryCost ?? null,
      dispatchPoint: warehouse.dispatchPoint ?? "",
      internalComment: warehouse.internalComment ?? "",
      orderChecked: Boolean(warehouse.orderChecked),
      assembled: Boolean(warehouse.assembled),
      fiscalReceiptDone: Boolean(warehouse.fiscalReceiptDone),
      honestSignDone: Boolean(warehouse.honestSignDone),
      batchesAssigned: Boolean(warehouse.batchesAssigned),
      handedToDelivery: Boolean(warehouse.handedToDelivery),
      updatedAt: warehouse.updatedAt ?? "",
    },
  };
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  let query = db
    .from("payment_orders")
    .select("id,status,amount_kopecks,customer,items,delivery,created_at,updated_at")
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (from && /^\d{4}-\d{2}-\d{2}$/.test(from)) query = query.gte("created_at", `${from}T00:00:00+03:00`);
  if (to && /^\d{4}-\d{2}-\d{2}$/.test(to)) query = query.lt("created_at", `${to}T23:59:59.999+03:00`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shipments: (data ?? []).map((row) => mapShipment(row)) });
}

export async function PATCH(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let body: { orderId?: string; changes?: Record<string, unknown> };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  if (!body.orderId || !body.changes || typeof body.changes !== "object") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body.changes)) {
    if (BOOLEAN_FIELDS.has(key) && typeof value === "boolean") normalized[key] = value;
    if (TEXT_FIELDS.has(key) && typeof value === "string") normalized[key] = value.trim().slice(0, key === "internalComment" ? 2000 : 300);
    if (key === "actualDeliveryCost") {
      const amount = value === "" || value == null ? null : Number(value);
      if (amount === null || (Number.isFinite(amount) && amount >= 0 && amount <= 100000)) normalized[key] = amount;
    }
  }
  if (!Object.keys(normalized).length) return NextResponse.json({ error: "no_valid_changes" }, { status: 400 });

  const { data: current, error: readError } = await db
    .from("payment_orders").select("id,delivery").eq("id", body.orderId).maybeSingle();
  if (readError || !current) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  const delivery = (current.delivery ?? {}) as Record<string, unknown>;
  const warehouse = (delivery.warehouse ?? {}) as WarehouseData;
  const now = new Date().toISOString();
  const historyChanges = Object.fromEntries(Object.entries(normalized).map(([key, value]) => [key, {
    from: warehouse[key as keyof WarehouseData] ?? null,
    to: value,
  }]));
  const history = [...(Array.isArray(warehouse.history) ? warehouse.history : []), { at: now, changes: historyChanges }].slice(-100);
  const nextWarehouse = { ...warehouse, ...normalized, updatedAt: now, history };
  const { error } = await db.from("payment_orders").update({
    delivery: { ...delivery, warehouse: nextWarehouse },
    updated_at: now,
  }).eq("id", body.orderId);
  if (error) return NextResponse.json({ error: "save_failed" }, { status: 500 });
  return NextResponse.json({ ok: true, warehouse: nextWarehouse });
}
