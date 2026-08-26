import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/adminAuth";
import { getServerSupabase } from "@/lib/supabaseServer";

type Json = Record<string, unknown>;
type Batch = { id: string; product_id: string; supply_id: string | null; lot_number: string; received_quantity: number; remaining_quantity: number; production_cost_kopecks: number };
type Supply = { id: string; supply_number: string; received_at: string; manufactured_at: string | null; expires_at: string | null; notes: string | null };
type Expense = { id: string; occurred_on: string; period_from: string | null; period_to: string | null; amount_kopecks: number; category: string; description: string | null; batch_id: string | null; supply_id: string | null; created_at: string };
type Allocation = { order_id: string; batch_id: string | null; quantity: number; status: string };
type OrderLine = { productId?: string; quantity?: number; stockAmount?: number; unitPrice?: number };
type PaidOrder = { id: string; amount_kopecks: number; delivery: unknown; items: unknown; created_at: string };

const CATEGORIES = new Set(["production", "raw_materials", "packaging", "laboratory", "design", "server", "software", "marketing", "payment_fee", "tax", "refund", "other"]);

function dateParam(value: string | null, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

function asDelivery(value: unknown): Json { return value && typeof value === "object" ? value as Json : {}; }

// Историю не удаляем: исключённая строка остаётся видимой в журнале, но не
// участвует второй раз в себестоимости. Это нужно для старой общей
// «Спецификации», когда цена завода уже внесена отдельно по каждой баночке.
function isExcludedFromCalculation(expense: Expense) {
  return String(expense.description || "").startsWith("[ИСКЛЮЧЕНО ИЗ РАСЧЁТА]");
}

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
  const selectedSupplyId = request.nextUrl.searchParams.get("supply") || "";
  if (from > to) return NextResponse.json({ error: "Некорректный период" }, { status: 400 });

  const [ordersResult, allPaidOrdersResult, expensesResult, batchesResult, suppliesResult, productsResult, allocationsResult, settingsResult] = await Promise.all([
    db.from("payment_orders").select("id,status,amount_kopecks,delivery,items,created_at").eq("status", "paid").gte("created_at", `${from}T00:00:00+03:00`).lte("created_at", `${to}T23:59:59.999+03:00`).order("created_at", { ascending: true }).limit(5000),
    db.from("payment_orders").select("id,status,amount_kopecks,delivery,items,created_at").eq("status", "paid").order("created_at", { ascending: true }).limit(5000),
    db.from("financial_expenses").select("id,occurred_on,period_from,period_to,amount_kopecks,category,description,batch_id,supply_id,created_at").order("occurred_on", { ascending: false }).limit(5000),
    db.from("inventory_batches").select("id,product_id,supply_id,lot_number,received_quantity,remaining_quantity,production_cost_kopecks").order("received_at", { ascending: false }).limit(3000),
    db.from("inventory_supplies").select("id,supply_number,received_at,manufactured_at,expires_at,notes").order("received_at", { ascending: false }).limit(1000),
    db.from("products").select("id,data").limit(3000),
    db.from("order_batch_allocations").select("order_id,batch_id,quantity,status").eq("status", "written_off").limit(10000),
    db.from("financial_settings").select("usn_rate_bps").eq("singleton", true).maybeSingle(),
  ]);
  const error = ordersResult.error || allPaidOrdersResult.error || expensesResult.error || batchesResult.error || suppliesResult.error || productsResult.error || allocationsResult.error || settingsResult.error;
  if (error) return NextResponse.json({ error: displayError(error.message) }, { status: 500 });

  const allExpenses = (expensesResult.data ?? []) as Expense[];
  const countedExpenses = allExpenses.filter((expense) => !isExcludedFromCalculation(expense));
  const batches = (batchesResult.data ?? []) as Batch[];
  const supplies = (suppliesResult.data ?? []) as Supply[];
  const productInfoById = new Map((productsResult.data ?? []).map((product) => {
    const data = (product.data as Json | null) ?? {};
    return [String(product.id), { name: String(data.name ?? product.id), price: Number(data.price ?? 0) }];
  }));
  const allocations = (allocationsResult.data ?? []) as Allocation[];
  const batchById = new Map(batches.map((batch) => [batch.id, batch]));
  const batchesBySupplyId = new Map<string, Batch[]>();
  for (const batch of batches) if (batch.supply_id) batchesBySupplyId.set(batch.supply_id, [...(batchesBySupplyId.get(batch.supply_id) || []), batch]);
  // Расходы у поставки и расходы у конкретной баночки живут раздельно.
  // Это важно для одной общей поставки с несколькими товарами: цена завода,
  // этикетка или анализ одного БАДa не должны усредняться по всем трём.
  const supplyWideExpenseById = new Map<string, number>();
  const batchExpenseById = new Map<string, number>();
  const unassignedBusinessExpenses = countedExpenses.filter((expense) => !expense.supply_id && !expense.batch_id && expense.category !== "tax").reduce((sum, expense) => sum + Number(expense.amount_kopecks), 0);
  for (const expense of countedExpenses) {
    if (expense.category === "tax") continue;
    if (expense.batch_id && batchById.has(expense.batch_id)) {
      batchExpenseById.set(expense.batch_id, (batchExpenseById.get(expense.batch_id) || 0) + Number(expense.amount_kopecks));
    } else if (expense.supply_id) {
      supplyWideExpenseById.set(expense.supply_id, (supplyWideExpenseById.get(expense.supply_id) || 0) + Number(expense.amount_kopecks));
    }
  }
  const totalSupplyUnits = supplies.reduce((sum, supply) => sum + (batchesBySupplyId.get(supply.id) || []).reduce((batchSum, batch) => batchSum + Number(batch.received_quantity), 0), 0);
  const allocatedCommonExpenseById = new Map<string, number>();
  for (const supply of supplies) {
    const units = (batchesBySupplyId.get(supply.id) || []).reduce((sum, batch) => sum + Number(batch.received_quantity), 0);
    allocatedCommonExpenseById.set(supply.id, totalSupplyUnits ? Math.round(unassignedBusinessExpenses * units / totalSupplyUnits) : 0);
  }
  const batchUnitCostById = new Map<string, number>();
  for (const supply of supplies) {
    const supplyBatches = batchesBySupplyId.get(supply.id) || [];
    const quantity = supplyBatches.reduce((sum, batch) => sum + Number(batch.received_quantity), 0);
    const sharedSupplyCost = supplyWideExpenseById.get(supply.id) || 0;
    for (const batch of supplyBatches) {
      const batchQuantity = Number(batch.received_quantity);
      const share = quantity ? batchQuantity / quantity : 0;
      // Себестоимость поступления: цена завода позиции + прямые расходы
      // позиции + её доля общих затрат именно этой поставки.
      const landedCost = Number(batch.production_cost_kopecks) + (batchExpenseById.get(batch.id) || 0) + Math.round(sharedSupplyCost * share);
      batchUnitCostById.set(batch.id, landedCost / Math.max(1, batchQuantity));
    }
  }
  const allocationsByOrder = new Map<string, Allocation[]>();
  for (const allocation of allocations) allocationsByOrder.set(allocation.order_id, [...(allocationsByOrder.get(allocation.order_id) || []), allocation]);
  const isInSupply = (allocation: Allocation, supplyId: string) => Boolean(allocation.batch_id && batchById.get(allocation.batch_id)?.supply_id === supplyId);
  const rows = ((ordersResult.data ?? []) as PaidOrder[]).filter((order) => asDelivery(order.delivery).orderStatus !== "cancelled").filter((order) => !selectedSupplyId || (allocationsByOrder.get(order.id) || []).some((allocation) => isInSupply(allocation, selectedSupplyId)));
  const orderIds = new Set(rows.map((order) => String(order.id)));
  const costByOrder = new Map<string, number>();
  const uncostedByOrder = new Map<string, number>();
  for (const allocation of allocations) {
    if (!orderIds.has(allocation.order_id)) continue;
    if (!allocation.batch_id || !batchById.has(allocation.batch_id)) {
      if (selectedSupplyId) continue;
      uncostedByOrder.set(allocation.order_id, (uncostedByOrder.get(allocation.order_id) || 0) + Number(allocation.quantity));
      continue;
    }
    const batch = batchById.get(allocation.batch_id)!;
    if (selectedSupplyId && batch.supply_id !== selectedSupplyId) continue;
    const unitCost = batchUnitCostById.get(batch.id) || 0;
    costByOrder.set(allocation.order_id, (costByOrder.get(allocation.order_id) || 0) + Math.round(unitCost * Number(allocation.quantity)));
  }
  const periodExpenses = countedExpenses.filter((expense) => expense.occurred_on >= from && expense.occurred_on <= to);
  const expenseSupplyId = (expense: Expense) => expense.supply_id || (expense.batch_id ? batchById.get(expense.batch_id)?.supply_id || null : null);
  const shownExpenses = selectedSupplyId ? periodExpenses.filter((expense) => expenseSupplyId(expense) === selectedSupplyId) : periodExpenses;
  const allDirectPeriodSupplyExpenses = periodExpenses.filter((expense) => expenseSupplyId(expense) !== null && expense.category !== "tax").reduce((sum, expense) => sum + Number(expense.amount_kopecks), 0);
  const allGeneralPeriodExpenses = periodExpenses.filter((expense) => expenseSupplyId(expense) === null && expense.category !== "tax").reduce((sum, expense) => sum + Number(expense.amount_kopecks), 0);
  const selectedSupplyUnits = selectedSupplyId ? (batchesBySupplyId.get(selectedSupplyId) || []).reduce((sum, batch) => sum + Number(batch.received_quantity), 0) : 0;
  const selectedSupplyShare = selectedSupplyId && totalSupplyUnits ? selectedSupplyUnits / totalSupplyUnits : 0;
  const directPeriodSupplyExpenses = selectedSupplyId
    ? shownExpenses.filter((expense) => expense.category !== "tax").reduce((sum, expense) => sum + Number(expense.amount_kopecks), 0)
    : allDirectPeriodSupplyExpenses;
  const generalPeriodExpenses = selectedSupplyId ? Math.round(allGeneralPeriodExpenses * selectedSupplyShare) : allGeneralPeriodExpenses;
  const totalPeriodExpenses = selectedSupplyId ? directPeriodSupplyExpenses + generalPeriodExpenses : allDirectPeriodSupplyExpenses + allGeneralPeriodExpenses;
  const actualTax = shownExpenses.filter((expense) => expense.category === "tax").reduce((sum, expense) => sum + Number(expense.amount_kopecks), 0);
  let revenue = 0, deliveryCollected = 0, deliveryActual = 0, cogs = 0, uncostedUnits = 0;
  const daily = new Map<string, { date: string; revenue: number; deliveryActual: number; cogs: number; operating: number }>();
  for (const row of rows) {
    const delivery = asDelivery(row.delivery);
    const warehouse = asDelivery(delivery.warehouse);
    const lines = (Array.isArray(row.items) ? row.items : []) as OrderLine[];
    const allLinesCost = lines.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || line.stockAmount || 1), 0);
    const scopedLinesCost = selectedSupplyId ? (allocationsByOrder.get(row.id) || []).filter((allocation) => isInSupply(allocation, selectedSupplyId)).reduce((sum, allocation) => sum + Number(lines.find((line) => line.productId === batchById.get(allocation.batch_id || "")?.product_id)?.unitPrice || 0) * Number(allocation.quantity), 0) : allLinesCost;
    const share = selectedSupplyId ? (allLinesCost > 0 ? Math.min(1, scopedLinesCost / allLinesCost) : 1) : 1;
    const total = Math.round(Number(row.amount_kopecks || 0) * share);
    const actual = Math.round(Number(warehouse.actualDeliveryCost || 0) * 100 * share);
    const orderCost = costByOrder.get(String(row.id)) || 0;
    const day = String(row.created_at).slice(0, 10);
    const entry = daily.get(day) || { date: day, revenue: 0, deliveryActual: 0, cogs: 0, operating: 0 };
    entry.revenue += total; entry.deliveryActual += actual; entry.cogs += orderCost; daily.set(day, entry);
    revenue += total;
    deliveryCollected += Math.round(Number(delivery.price || 0) * 100 * share);
    deliveryActual += actual;
    cogs += orderCost;
    uncostedUnits += uncostedByOrder.get(String(row.id)) || 0;
  }
  for (const expense of shownExpenses.filter((expense) => expense.category !== "tax")) {
    const entry = daily.get(expense.occurred_on) || { date: expense.occurred_on, revenue: 0, deliveryActual: 0, cogs: 0, operating: 0 };
    entry.operating += Number(expense.amount_kopecks); daily.set(expense.occurred_on, entry);
  }
  const usnRateBps = Number(settingsResult.data?.usn_rate_bps ?? 600);
  const estimatedTax = Math.round(revenue * usnRateBps / 10_000);
  const profitBeforeTax = revenue - deliveryActual - totalPeriodExpenses;

  const supplyStats = new Map<string, { revenue: number; soldUnits: number; orderIds: Set<string>; deliveryActual: number }>();
  const batchStats = new Map<string, { revenue: number; soldUnits: number; orderIds: Set<string> }>();
  for (const supply of supplies) supplyStats.set(supply.id, { revenue: 0, soldUnits: 0, orderIds: new Set(), deliveryActual: 0 });
  for (const batch of batches) batchStats.set(batch.id, { revenue: 0, soldUnits: 0, orderIds: new Set() });
  for (const order of (allPaidOrdersResult.data ?? []) as PaidOrder[]) {
    if (asDelivery(order.delivery).orderStatus === "cancelled") continue;
    const lines = (Array.isArray(order.items) ? order.items : []) as OrderLine[];
    const totalLines = lines.reduce((sum, line) => sum + Number(line.unitPrice || 0) * Number(line.quantity || line.stockAmount || 1), 0);
    const grouped = new Map<string, { value: number; units: number }>();
    for (const allocation of allocationsByOrder.get(order.id) || []) {
      const batch = allocation.batch_id ? batchById.get(allocation.batch_id) : null;
      if (!batch?.supply_id) continue;
      const current = grouped.get(batch.supply_id) || { value: 0, units: 0 };
      const unitPrice = Number(lines.find((line) => line.productId === batch.product_id)?.unitPrice || productInfoById.get(batch.product_id)?.price || 0);
      current.value += unitPrice * Number(allocation.quantity);
      current.units += Number(allocation.quantity);
      grouped.set(batch.supply_id, current);

      const batchSale = batchStats.get(batch.id);
      if (batchSale) {
        const lineShare = totalLines > 0 ? Math.min(1, unitPrice * Number(allocation.quantity) / totalLines) : 1;
        batchSale.revenue += Math.round(Number(order.amount_kopecks || 0) * lineShare);
        batchSale.soldUnits += Number(allocation.quantity);
        batchSale.orderIds.add(order.id);
      }
    }
    for (const [supplyId, item] of grouped) {
      const stats = supplyStats.get(supplyId); if (!stats) continue;
      const share = totalLines > 0 ? Math.min(1, item.value / totalLines) : 1;
      stats.revenue += Math.round(Number(order.amount_kopecks || 0) * share);
      stats.soldUnits += item.units; stats.orderIds.add(order.id);
      stats.deliveryActual += Math.round(Number(asDelivery(asDelivery(order.delivery).warehouse).actualDeliveryCost || 0) * 100 * share);
    }
  }

  return NextResponse.json({
    from, to, settings: { usnRateBps },
    selectedSupplyId,
    summary: { paidOrders: rows.length, revenue, productRevenue: revenue - deliveryCollected, deliveryCollected, deliveryActual, deliveryDifference: deliveryCollected - deliveryActual, cogs, grossProductProfit: revenue - deliveryCollected - cogs, totalPeriodExpenses, directPeriodSupplyExpenses, generalPeriodExpenses, profitBeforeTax, estimatedTax, actualTax, estimatedNetProfit: profitBeforeTax - estimatedTax, uncostedUnits },
    daily: [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)).map((entry) => ({ ...entry, profitBeforeTax: entry.revenue - entry.deliveryActual - entry.cogs - entry.operating })),
    expenses: shownExpenses.map((expense) => ({ ...expense, batch: expense.batch_id ? batchById.get(expense.batch_id) ? { id: expense.batch_id, lotNumber: batchById.get(expense.batch_id)!.lot_number } : null : null, supply: expenseSupplyId(expense) ? supplies.find((supply) => supply.id === expenseSupplyId(expense)) ? { id: expenseSupplyId(expense)!, supplyNumber: supplies.find((supply) => supply.id === expenseSupplyId(expense))!.supply_number } : null : null })),
    batches: batches.map((batch) => ({ ...batch, extraCosts: batchExpenseById.get(batch.id) || 0, totalCost: Math.round((batchUnitCostById.get(batch.id) || 0) * Number(batch.received_quantity)) })),
    supplies: supplies.map((supply) => {
      const supplyBatches = batchesBySupplyId.get(supply.id) || [];
      const sharedSupplyCosts = supplyWideExpenseById.get(supply.id) || 0;
      const productDirectCosts = supplyBatches.reduce((sum, batch) => sum + Number(batch.production_cost_kopecks) + (batchExpenseById.get(batch.id) || 0), 0);
      const directCosts = sharedSupplyCosts + productDirectCosts;
      const allocatedCommonCosts = allocatedCommonExpenseById.get(supply.id) || 0;
      const totalReceived = supplyBatches.reduce((sum, batch) => sum + Number(batch.received_quantity), 0);
      const stats = supplyStats.get(supply.id) || { revenue: 0, soldUnits: 0, orderIds: new Set<string>(), deliveryActual: 0 };
      const orderCount = stats.orderIds.size;
      const averageUnitsPerOrder = orderCount ? stats.soldUnits / orderCount : 0;
      const projectedOrders = averageUnitsPerOrder ? totalReceived / averageUnitsPerOrder : 0;
      const projectedRevenue = supplyBatches.reduce((sum, batch) => sum + Number(productInfoById.get(batch.product_id)?.price || 0) * Number(batch.received_quantity) * 100, 0);
      const averageDeliveryPerOrder = orderCount ? stats.deliveryActual / orderCount : 0;
      const projectedDelivery = Math.round(projectedOrders * averageDeliveryPerOrder);
      const totalCost = directCosts + allocatedCommonCosts;
      const projectedTax = Math.round(projectedRevenue * usnRateBps / 10_000);
      return {
        ...supply, sharedSupplyCosts, productDirectCosts, directCosts, allocatedCommonCosts, totalCost, totalReceived,
        totalRemaining: supplyBatches.reduce((sum, batch) => sum + Number(batch.remaining_quantity), 0),
        products: supplyBatches.map((batch) => {
          const quantity = Number(batch.received_quantity);
          const share = totalReceived ? quantity / totalReceived : 0;
          const factoryCost = Number(batch.production_cost_kopecks);
          const factoryUnitCost = quantity ? Math.round(factoryCost / quantity) : 0;
          const directProductCosts = batchExpenseById.get(batch.id) || 0;
          const sharedCostShare = Math.round(sharedSupplyCosts * share);
          const landedCost = factoryCost + directProductCosts + sharedCostShare;
          const fullCost = landedCost + Math.round(allocatedCommonCosts * share);
          const price = Number(productInfoById.get(batch.product_id)?.price || 0) * 100;
          const productStats = batchStats.get(batch.id) || { revenue: 0, soldUnits: 0, orderIds: new Set<string>() };
          const projectedProductRevenue = price * quantity;
          // Полная экономика товара: помимо цены завода и расходов поставки
          // сюда попадает доля общих расходов бизнеса (сервер, дизайнер,
          // сервисы и т. п.), которые внесены в журнал без привязки к товару.
          const grossProfit = projectedProductRevenue - fullCost;
          return {
            id: batch.id, productId: batch.product_id, lotNumber: batch.lot_number,
            name: productInfoById.get(batch.product_id)?.name || batch.product_id,
            received: quantity, remaining: Number(batch.remaining_quantity), sold: productStats.soldUnits,
            factoryCost, factoryUnitCost, directProductCosts, sharedCostShare, landedCost, landedUnitCost: quantity ? Math.round(landedCost / quantity) : 0,
            allocatedCommonCosts: Math.round(allocatedCommonCosts * share), fullCost, fullUnitCost: quantity ? Math.round(fullCost / quantity) : 0,
            websitePrice: price, soldRevenue: productStats.revenue, soldOrders: productStats.orderIds.size,
            projectedRevenue: projectedProductRevenue, grossProfit, grossMarginBps: projectedProductRevenue ? Math.round(grossProfit / projectedProductRevenue * 10_000) : 0,
          };
        }),
        soldRevenue: stats.revenue, soldUnits: stats.soldUnits, soldOrders: orderCount,
        averageOrderRevenue: orderCount ? Math.round(stats.revenue / orderCount) : 0,
        projectedOrders: Math.round(projectedOrders * 10) / 10, projectedRevenue, projectedDelivery,
        projectedNetProfit: projectedRevenue - totalCost - projectedDelivery - projectedTax,
        estimatedCostPerOrder: projectedOrders ? Math.round((totalCost + projectedDelivery) / projectedOrders) : 0,
      };
    }),
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

  if (action === "saveBatchFactoryUnitCost") {
    const batchId = String(body.batchId || "");
    const factoryUnitCostKopecks = Number(body.factoryUnitCostKopecks);
    if (!/^[0-9a-f-]{36}$/i.test(batchId) || !Number.isInteger(factoryUnitCostKopecks) || factoryUnitCostKopecks < 0 || factoryUnitCostKopecks > 10_000_000_000) {
      return NextResponse.json({ error: "Проверьте товарную позицию и сумму" }, { status: 400 });
    }
    const { data: batch, error: readError } = await db.from("inventory_batches").select("received_quantity").eq("id", batchId).maybeSingle();
    if (readError || !batch) return NextResponse.json({ error: displayError(readError?.message || "Партия не найдена") }, { status: 404 });
    const factoryCostKopecks = factoryUnitCostKopecks * Number(batch.received_quantity);
    if (!Number.isSafeInteger(factoryCostKopecks)) return NextResponse.json({ error: "Сумма слишком большая" }, { status: 400 });
    const { error } = await db.from("inventory_batches").update({ production_cost_kopecks: factoryCostKopecks, updated_at: new Date().toISOString() }).eq("id", batchId);
    if (error) return NextResponse.json({ error: displayError(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "correctStarterSupply") {
    const { data: supply, error: supplyError } = await db.from("inventory_supplies").select("id,supply_number").ilike("supply_number", "%СТАРТОВЫЙ-20260820%").maybeSingle();
    if (supplyError || !supply) return NextResponse.json({ error: displayError(supplyError?.message || "Стартовая поставка не найдена") }, { status: 404 });
    const [{ data: batches, error: batchesError }, { data: products, error: productsError }, { data: expenses, error: expensesError }] = await Promise.all([
      db.from("inventory_batches").select("id,product_id,received_quantity,production_cost_kopecks").eq("supply_id", supply.id),
      db.from("products").select("id,data"),
      db.from("financial_expenses").select("id,description").eq("supply_id", supply.id).ilike("description", "%специфика%"),
    ]);
    const error = batchesError || productsError || expensesError;
    if (error) return NextResponse.json({ error: displayError(error.message) }, { status: 500 });
    const productDataById = new Map((products || []).map((product) => [String(product.id), (product.data || {}) as Json]));
    const stockByProductId = new Map([...productDataById.entries()].map(([id, data]) => [id, Number(data.stockQty)]));
    for (const batch of batches || []) {
      const remaining = stockByProductId.get(String(batch.product_id));
      if (!Number.isInteger(remaining) || Number(remaining) < 0 || Number(remaining) > 300) {
        return NextResponse.json({ error: "Не удалось взять текущий остаток из карточки товара" }, { status: 400 });
      }
      const productData = productDataById.get(String(batch.product_id)) || {};
      const productName = String(productData.name || "").toLowerCase();
      const isCitrate = `${String(batch.product_id).toLowerCase()} ${productName}`.includes("цитрат") || `${String(batch.product_id).toLowerCase()} ${productName}`.includes("citrat");
      const productionCost = isCitrate ? 303 * 100 * 300 : Number(batch.production_cost_kopecks || 0);
      const { error: updateError } = await db.from("inventory_batches").update({ received_quantity: 300, remaining_quantity: remaining, production_cost_kopecks: productionCost, updated_at: new Date().toISOString() }).eq("id", batch.id);
      if (updateError) return NextResponse.json({ error: displayError(updateError.message) }, { status: 500 });
    }
    for (const expense of expenses || []) {
      const description = String(expense.description || "");
      if (description.startsWith("[ИСКЛЮЧЕНО ИЗ РАСЧЁТА]")) continue;
      const { error: updateError } = await db.from("financial_expenses").update({ description: `[ИСКЛЮЧЕНО ИЗ РАСЧЁТА] ${description}`, updated_at: new Date().toISOString() }).eq("id", expense.id);
      if (updateError) return NextResponse.json({ error: displayError(updateError.message) }, { status: 500 });
    }
    return NextResponse.json({ ok: true, changedBatches: (batches || []).length, excludedExpenses: (expenses || []).length });
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
    const supplyId = body.supplyId ? String(body.supplyId) : null;
    const periodFrom = body.periodFrom ? String(body.periodFrom) : null;
    const periodTo = body.periodTo ? String(body.periodTo) : null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(occurredOn) || !Number.isInteger(amountKopecks) || amountKopecks <= 0 || amountKopecks > 10_000_000_000 || !CATEGORIES.has(category)) {
      return NextResponse.json({ error: "Проверьте дату, сумму и категорию расхода" }, { status: 400 });
    }
    if ((periodFrom && !/^\d{4}-\d{2}-\d{2}$/.test(periodFrom)) || (periodTo && !/^\d{4}-\d{2}-\d{2}$/.test(periodTo)) || (periodFrom && periodTo && periodFrom > periodTo)) {
      return NextResponse.json({ error: "Проверьте период расхода" }, { status: 400 });
    }
    const payload = { occurred_on: occurredOn, amount_kopecks: amountKopecks, category, batch_id: supplyId ? null : batchId, supply_id: supplyId, period_from: periodFrom, period_to: periodTo, description: String(body.description || "").trim().slice(0, 1000) || null, updated_at: new Date().toISOString() };
    const query = id ? db.from("financial_expenses").update(payload).eq("id", id) : db.from("financial_expenses").insert(payload);
    const { error } = await query;
    if (error) return NextResponse.json({ error: displayError(error.message) }, { status: 500 });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "unknown_action" }, { status: 400 });
}
