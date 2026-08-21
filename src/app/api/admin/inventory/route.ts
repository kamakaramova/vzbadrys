import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/adminAuth";
import { getServerSupabase } from "@/lib/supabaseServer";

function inventoryError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("inventory_") || lower.includes("schema cache") || lower.includes("could not find")) {
    return "Склад ещё не включён в базе данных";
  }
  return message;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const [productsResult, batchesResult, movementsResult, allocationsResult, ordersResult] = await Promise.all([
    db.from("products").select("id,data").order("id"),
    db.from("inventory_batches").select("id,product_id,lot_number,manufactured_at,received_at,expires_at,received_quantity,remaining_quantity,production_cost_kopecks,status,notes,created_at,updated_at").order("received_at", { ascending: true }),
    db.from("inventory_movements").select("id,batch_id,product_id,order_id,kind,quantity,reason,created_at").order("created_at", { ascending: false }).limit(500),
    db.from("order_batch_allocations").select("id,order_id,product_id,batch_id,quantity,status,created_at,updated_at").eq("status", "written_off").order("created_at", { ascending: true }),
    db.from("payment_orders").select("id,customer,items,delivery,created_at").eq("status", "paid").order("created_at", { ascending: false }).limit(250),
  ]);
  const error = productsResult.error || batchesResult.error || movementsResult.error || allocationsResult.error || ordersResult.error;
  if (error) return NextResponse.json({ error: inventoryError(error.message) }, { status: 500 });

  const products = (productsResult.data ?? []).map((row) => {
    const product = (row.data ?? {}) as Record<string, unknown>;
    return {
      id: String(row.id),
      name: String(product.name ?? row.id),
      category: String(product.category ?? "bads"),
      stockQty: typeof product.stockQty === "number" ? product.stockQty : null,
      inStock: Boolean(product.inStock),
    };
  });
  const orders = (ordersResult.data ?? []).map((row) => {
    const customer = (row.customer ?? {}) as Record<string, unknown>;
    const delivery = (row.delivery ?? {}) as Record<string, unknown>;
    return {
      id: String(row.id),
      createdAt: String(row.created_at ?? ""),
      customerName: [customer.name, customer.surname].filter(Boolean).join(" "),
      orderStatus: String(delivery.orderStatus ?? "processing"),
      items: ((row.items ?? []) as Record<string, unknown>[]).map((item) => ({
        productId: String(item.productId ?? ""),
        name: String(item.name ?? "Товар"),
        quantity: Number(item.quantity ?? 1),
        stockAmount: Number(item.stockAmount ?? 0),
      })),
    };
  });

  return NextResponse.json({
    products,
    batches: batchesResult.data ?? [],
    movements: movementsResult.data ?? [],
    allocations: allocationsResult.data ?? [],
    orders,
  });
}

type InventoryBody = {
  action?: "receive" | "adjust" | "reassign" | "batchStatus" | "editBatch";
  productId?: string;
  lotNumber?: string;
  manufacturedAt?: string | null;
  receivedAt?: string | null;
  expiresAt?: string | null;
  quantity?: number;
  notes?: string;
  productionCostKopecks?: number;
  batchId?: string;
  newRemaining?: number;
  reason?: string;
  orderId?: string;
  allocations?: Array<{ batchId: string | null; quantity: number }>;
  status?: "active" | "quarantined" | "depleted";
};

function validDate(value?: string | null) {
  return !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  let body: InventoryBody;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }

  if (body.action === "receive") {
    const quantity = Number(body.quantity);
    if (!body.productId || !body.lotNumber?.trim() || !Number.isInteger(quantity) || quantity <= 0 || quantity > 10_000_000) {
      return NextResponse.json({ error: "Проверьте товар, номер партии и количество" }, { status: 400 });
    }
    if (!validDate(body.manufacturedAt) || !validDate(body.receivedAt) || !validDate(body.expiresAt) || !body.receivedAt) {
      return NextResponse.json({ error: "Проверьте даты партии" }, { status: 400 });
    }
    const productionCostKopecks = Number(body.productionCostKopecks ?? 0);
    if (!Number.isInteger(productionCostKopecks) || productionCostKopecks < 0 || productionCostKopecks > 10_000_000_000) {
      return NextResponse.json({ error: "Проверьте стоимость партии" }, { status: 400 });
    }
    const { data, error } = await db.rpc("inventory_receive_batch_v3", {
      p_product_id: body.productId,
      p_lot_number: body.lotNumber.trim().slice(0, 120),
      p_manufactured_at: body.manufacturedAt || null,
      p_received_at: body.receivedAt,
      p_expires_at: body.expiresAt || null,
      p_quantity: quantity,
      p_notes: body.notes?.trim().slice(0, 1000) || null,
      p_production_cost_kopecks: productionCostKopecks,
    });
    if (error) return NextResponse.json({ error: inventoryError(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true, batchId: data });
  }

  if (body.action === "editBatch") {
    if (!body.batchId || !body.lotNumber?.trim() || !body.receivedAt || !validDate(body.manufacturedAt) || !validDate(body.receivedAt) || !validDate(body.expiresAt)) {
      return NextResponse.json({ error: "Укажите номер партии и дату приёмки" }, { status: 400 });
    }
    if (body.manufacturedAt && body.expiresAt && body.expiresAt < body.manufacturedAt) {
      return NextResponse.json({ error: "Срок годности не может быть раньше даты производства" }, { status: 400 });
    }
    const productionCostKopecks = Number(body.productionCostKopecks ?? 0);
    if (!Number.isInteger(productionCostKopecks) || productionCostKopecks < 0 || productionCostKopecks > 10_000_000_000) {
      return NextResponse.json({ error: "Проверьте стоимость партии" }, { status: 400 });
    }
    const { error } = await db.rpc("inventory_update_batch_metadata_v2", {
      p_batch_id: body.batchId,
      p_lot_number: body.lotNumber.trim().slice(0, 120),
      p_manufactured_at: body.manufacturedAt || null,
      p_received_at: body.receivedAt,
      p_expires_at: body.expiresAt || null,
      p_notes: body.notes?.trim().slice(0, 1000) || null,
      p_production_cost_kopecks: productionCostKopecks,
    });
    if (error) {
      const message = error.message.toLowerCase().includes("duplicate key")
        ? "Такая партия для этого товара уже существует"
        : inventoryError(error.message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "adjust") {
    const remaining = Number(body.newRemaining);
    if (!body.batchId || !Number.isInteger(remaining) || remaining < 0 || remaining > 10_000_000 || !body.reason?.trim()) {
      return NextResponse.json({ error: "Укажите фактический остаток и причину" }, { status: 400 });
    }
    const { error } = await db.rpc("inventory_adjust_batch", {
      p_batch_id: body.batchId,
      p_new_remaining: remaining,
      p_reason: body.reason.trim().slice(0, 500),
    });
    if (error) return NextResponse.json({ error: inventoryError(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "reassign") {
    if (!body.orderId || !body.productId || !Array.isArray(body.allocations) || !body.allocations.length) {
      return NextResponse.json({ error: "Не выбраны партии для заказа" }, { status: 400 });
    }
    const allocations = body.allocations.map((item) => ({
      batchId: item.batchId || null,
      quantity: Number(item.quantity),
    }));
    if (allocations.some((item) => !Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > 10_000_000)) {
      return NextResponse.json({ error: "Проверьте количество по партиям" }, { status: 400 });
    }
    const { error } = await db.rpc("inventory_reassign_order_product", {
      p_order_id: body.orderId,
      p_product_id: body.productId,
      p_allocations: allocations,
    });
    if (error) return NextResponse.json({ error: inventoryError(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "batchStatus") {
    if (!body.batchId || !body.status || !["active", "quarantined", "depleted"].includes(body.status)) {
      return NextResponse.json({ error: "Неверный статус партии" }, { status: 400 });
    }
    const { data: batch, error: readError } = await db.from("inventory_batches").select("product_id,remaining_quantity").eq("id", body.batchId).maybeSingle();
    if (readError || !batch) return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
    const status = body.status === "depleted" && Number(batch.remaining_quantity) > 0 ? "active" : body.status;
    const { error } = await db.from("inventory_batches").update({ status, updated_at: new Date().toISOString() }).eq("id", body.batchId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const { error: syncError } = await db.rpc("inventory_sync_product_stock", { p_product_id: batch.product_id });
    if (syncError) return NextResponse.json({ error: inventoryError(syncError.message) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
