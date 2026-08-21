import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/adminAuth";
import { getServerSupabase } from "@/lib/supabaseServer";

type Json = Record<string, unknown>;
type Batch = { id: string; product_id: string; lot_number: string; received_quantity: number; remaining_quantity: number; production_cost_kopecks: number };
type Expense = { id: string; occurred_on: string; period_from: string | null; period_to: string | null; amount_kopecks: number; category: string; description: string | null; batch_id: string | null; created_at: string };
type Allocation = { order_id: string; batch_id: string | null; quantity: number; status: string };

const CATEGORIES = new Set(["production", "raw_materials", "packaging", "laboratory", "design", "server", "software", "marketing", "payment_fee", "tax", "refund", "other"]);

function dateParam(value: string | null, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function asDelivery(value: unknown): Json { return value && typeof value === "object" ? value as Json : {}; }

function displayError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("financial_") || lower.includes("production_cost_kopecks") || lower.includes("schema cache")) return "Финансы ещё не включены в базе данных";
  return message;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString("sv-SE");
  const defaultTo = now.toLocaleDateString("sv-SE");
  const from = dateParam(request.nextUrl.searchParams.get("from"), defaultFrom);
  const to = dateParam(request.nextUrl.searchParams.get("to"), defaultTo);
  if (from > to) return NextResponse.json({ error: "Некорректный период" }, { status: 400 });

  const [ordersResult, expensesResult, batchesResult, allocationsResult, settingsResult] = await Promise.all([
    db.from("payment_orders").select("id,status,amount_kopecks,delivery,created_at").eq("status", "paid").gte("created_at", `${from}T00:00:00+03:00`).lte("created_at", `${to}T23:59:59.999+03:00`).order("created_at", { ascending: true }).limit(5000),
    db.from("financial_expenses").select("id,occurred_on,period_from,period_to,amount_kopecks,category,description,batch_id,created_at").order("occurred_on", { ascending: false }).limit(5000),
    db.from("inventory_batches").select("id,product_id,lot_number,received_quantity,remaining_quantity,production_cost_kopecks").order("received_at", { ascending: false }).limit(3000),
    db.from("order_batch_allocations").select("order_id,batch_id,quantity,status").eq("status", "written_off").limit(10000),
    db.from("financial_settings").select("usn_rate_bps").eq("singleton", true).maybeSingle(),
  ]);
  const error = ordersResult.error || expensesResult.error || batchesResult.error || allocationsResult.error || settingsResult.error;
  if (error) return NextResponse.json({ error: displayError(error.message) }, { status: 500 });

  const allExpenses = (expensesResult.data ?? []) as Expense[];
  const batches = (batchesResult.data ?? []) as Batch[];
  const allocations = (allocationsResult.data ?? []) as Allocation[];
  const batchById = new Map(batches.map((batch) => [batch.id, batch]));
  const batchExpenseById = new Map<string, number>();
  for (const expense of allExpenses) if (expense.batch_id) batchExpenseById.set(expense.batch_id, (batchExpenseById.get(expense.batch_id) || 0) + Number(expense.amount_kopecks));
  const rows = (ordersResult.data ?? []).filter((order) => asDelivery(order.delivery).orderStatus !== "cancelled");
  const orderIds = new Set(rows.map((order) => String(order.id)));
  const costByOrder = new Map<string, number>();
  const uncostedByOrder = new Map<string, number>();
  for (const allocation of allocations) {
    if (!orderIds.has(allocation.order_id)) continue;
    if (!allocation.batch_id || !batchById.has(allocation.batch_id)) {
      uncostedByOrder.set(allocation.order_id, (uncostedByOrder.get(allocation.order_id) || 0) + Number(allocation.quantity));
      continue;
    }
    const batch = batchById.get(allocation.batch_id)!;
    const unitCost = (Number(batch.production_cost_kopecks || 0) + (batchExpenseById.get(batch.id) || 0)) / Math.max(1, Number(batch.received_quantity));
    costByOrder.set(allocation.order_id, (costByOrder.get(allocation.order_id) || 0) + Math.round(unitCost * Number(allocation.quantity)));
  }
  const periodExpenses = allExpenses.filter((expense) => expense.occurred_on >= from && expense.occurred_on <= to);
  const operatingExpenses = periodExpenses.filter((expense) => !expense.batch_id && expense.category !== "tax").reduce((sum, expense) => sum + Number(expense.amount_kopecks), 0);
  const actualTax = periodExpenses.filter((expense) => !expense.batch_id && expense.category === "tax").reduce((sum, expense) => sum + Number(expense.amount_kopecks), 0);
  let revenue = 0, deliveryCollected = 0, deliveryActual = 0, cogs = 0, uncostedUnits = 0;
  const daily = new Map<string, { date: string; revenue: number; deliveryActual: number; cogs: number; operating: number }>();
  for (const row of rows) {
    const delivery = asDelivery(row.delivery);
    const warehouse = asDelivery(delivery.warehouse);
    const total = Number(row.amount_kopecks || 0);
    const actual = Math.round(Number(warehouse.actualDeliveryCost || 0) * 100);
    const orderCost = costByOrder.get(String(row.id)) || 0;
    const day = String(row.created_at).slice(0, 10);
    const entry = daily.get(day) || { date: day, revenue: 0, deliveryActual: 0, cogs: 0, operating: 0 };
    entry.revenue += total; entry.deliveryActual += actual; entry.cogs += orderCost; daily.set(day, entry);
    revenue += total;
    deliveryCollected += Math.round(Number(delivery.price || 0) * 100);
    deliveryActual += actual;
    cogs += orderCost;
    uncostedUnits += uncostedByOrder.get(String(row.id)) || 0;
  }
  for (const expense of periodExpenses.filter((expense) => !expense.batch_id && expense.category !== "tax")) {
    const entry = daily.get(expense.occurred_on) || { date: expense.occurred_on, revenue: 0, deliveryActual: 0, cogs: 0, operating: 0 };
    entry.operating += Number(expense.amount_kopecks); daily.set(expense.occurred_on, entry);
  }
  const usnRateBps = Number(settingsResult.data?.usn_rate_bps ?? 600);
  const estimatedTax = Math.round(revenue * usnRateBps / 10_000);
  const profitBeforeTax = revenue - deliveryActual - cogs - operatingExpenses;

  return NextResponse.json({
    from, to, settings: { usnRateBps },
    summary: { paidOrders: rows.length, revenue, deliveryCollected, deliveryActual, deliveryDifference: deliveryCollected - deliveryActual, cogs, operatingExpenses, profitBeforeTax, estimatedTax, actualTax, estimatedNetProfit: profitBeforeTax - estimatedTax, uncostedUnits },
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)).map((entry) => ({ ...entry, profitBeforeTax: entry.revenue - entry.deliveryActual - entry.cogs - entry.operating })),
    expenses: periodExpenses.map((expense) => ({ ...expense, batch: expense.batch_id ? batchById.get(expense.batch_id) ? { id: expense.batch_id, lotNumber: batchById.get(expense.batch_id)!.lot_number } : null : null })),
    batches: batches.map((batch) => ({ ...batch, extraCosts: batchExpenseById.get(batch.id) || 0, totalCost: Number(batch.production_cost_kopecks || 0) + (batchExpenseById.get(batch.id) || 0) })),
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  let body: Json;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "bad_json" }, { status: 400 }); }
  const action = String(body.action || "");

  if (action === "saveSettings") {
    const usnRateBps = Number(body.usnRateBps);
    if (!Number.isInteger(usnRateBps) || usnRateBps < 0 || usnRateBps > 3000) return NextResponse.json({ error: "Проверьте ставку УСН" }, { status: 400 });
    const { error } = await db.from("financial_settings").upsert({ singleton: true, usn_rate_bps: usnRateBps, updated_at: new Date().toISOString() });
    if (error) return NextResponse.json({ error: displayError(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "deleteExpense") {
    const id = String(body.id || "");
    if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Некорректный расход" }, { status: 400 });
    const { error } = await db.from("financial_expenses").delete().eq("id", id);
    if (error) return NextResponse.json({ error: displayError(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "saveExpense") {
    const id = body.id ? String(body.id) : null;
    const occurredOn = String(body.occurredOn || "");
    const amountKopecks = Number(body.amountKopecks);
    const category = String(body.category || "");
    const batchId = body.batchId ? String(body.batchId) : null;
    const periodFrom = body.periodFrom ? String(body.periodFrom) : null;
    const periodTo = body.periodTo ? String(body.periodTo) : null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn) || !Number.isInteger(amountKopecks) || amountKopecks <= 0 || amountKopecks > 10_000_000_000 || !CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Проверьте дату, сумму и категорию расхода" }, { status: 400 });
    }
    if ((periodFrom && !/^\d{4}-\d{2}-\d{2}$/.test(periodFrom)) || (periodTo && !/^\d{4}-\d{2}-\d{2}$/.test(periodTo)) || (periodFrom && periodTo && periodFrom > periodTo)) {
      return NextResponse.json({ error: "Проверьте период расхода" }, { status: 400 });
    }
    const payload = { occurred_on: occurredOn, amount_kopecks: amountKopecks, category, batch_id: batchId, period_from: periodFrom, period_to: periodTo, description: String(body.description || "").trim().slice(0, 1000) || null, updated_at: new Date().toISOString() };
    const query = id ? db.from("financial_expenses").update(payload).eq("id", id) : db.from("financial_expenses").insert(payload);
    const { error } = await query;
    if (error) return NextResponse.json({ error: displayError(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
