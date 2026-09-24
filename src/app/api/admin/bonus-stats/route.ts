import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/adminAuth";
import { ORDER_BONUS_PERCENT } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";

type OrderRow = {
  id: string;
  amount_kopecks: number | null;
  user_id: string | null;
  customer: unknown;
  paid_at: string | null;
};

type LedgerRow = {
  user_id: string;
  amount: number | null;
  kind: string;
  order_id: string | null;
  status: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const [{ data: orders, error: ordersError }, { data: ledger, error: ledgerError }] = await Promise.all([
    db.from("payment_orders").select("id,amount_kopecks,user_id,customer,paid_at").eq("status", "paid"),
    db.from("bonus_ledger").select("user_id,amount,kind,order_id,status"),
  ]);
  if (ordersError || ledgerError) {
    return NextResponse.json({ error: ordersError?.message || ledgerError?.message || "Не удалось загрузить бонусы" }, { status: 500 });
  }

  const usersByEmail = new Map<string, string>();
  const baseBalances = new Map<string, number>();
  let page = 1;
  while (page <= 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: "Не удалось загрузить аккаунты покупателей" }, { status: 500 });
    for (const user of data.users) {
      if (user.email_confirmed_at && user.email) usersByEmail.set(user.email.trim().toLowerCase(), user.id);
      baseBalances.set(user.id, Math.max(0, Math.floor(Number(user.user_metadata?.bonusPoints || 0))));
    }
    if (data.users.length < 1000) break;
    page += 1;
  }

  const entries = (ledger ?? []) as LedgerRow[];
  const rewardsByOrder = new Map<string, LedgerRow[]>();
  for (const entry of entries) {
    if (entry.kind !== "order_reward" || !entry.order_id) continue;
    rewardsByOrder.set(entry.order_id, [...(rewardsByOrder.get(entry.order_id) ?? []), entry]);
  }

  let expectedAll = 0;
  let expectedLinked = 0;
  let postedOrderRewards = 0;
  let unlinkedOrders = 0;
  let unlinkedAmount = 0;
  const missingOrders: Array<{ id: string; paidAt: string | null; expected: number }> = [];
  const inconsistentOrders: Array<{ id: string; paidAt: string | null; expected: number; posted: number }> = [];

  for (const order of (orders ?? []) as OrderRow[]) {
    const expected = Math.floor((Number(order.amount_kopecks || 0) / 100) * ORDER_BONUS_PERCENT / 100);
    expectedAll += expected;
    const customer = asRecord(order.customer);
    const email = String(customer.email ?? "").trim().toLowerCase();
    const userId = order.user_id || usersByEmail.get(email) || "";
    if (!userId) {
      unlinkedOrders += 1;
      unlinkedAmount += expected;
      continue;
    }
    expectedLinked += expected;
    const rewardEntries = rewardsByOrder.get(order.id) ?? [];
    const posted = rewardEntries
      .filter((entry) => entry.status === "posted")
      .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    postedOrderRewards += posted;
    if (!rewardEntries.length) missingOrders.push({ id: order.id, paidAt: order.paid_at, expected });
    else if (posted !== expected || rewardEntries.length !== 1) inconsistentOrders.push({ id: order.id, paidAt: order.paid_at, expected, posted });
  }

  const totalsByKind: Record<string, number> = {};
  const balances = new Map(baseBalances);
  const creditedUsers = new Set<string>();
  for (const entry of entries) {
    const amount = Number(entry.amount || 0);
    if (entry.status === "posted") totalsByKind[entry.kind] = (totalsByKind[entry.kind] ?? 0) + amount;
    if (["posted", "reserved"].includes(entry.status)) balances.set(entry.user_id, (balances.get(entry.user_id) ?? 0) + amount);
    if (entry.status === "posted" && amount > 0) creditedUsers.add(entry.user_id);
  }

  const spent = Math.max(0, -(totalsByKind.order_payment ?? 0));
  const activeBalances = [...balances.values()].filter((balance) => balance > 0);
  return NextResponse.json({
    paidOrders: (orders ?? []).length,
    expectedAll,
    expectedLinked,
    postedOrderRewards,
    reviewRewards: totalsByKind.review_reward ?? 0,
    referralRewards: totalsByKind.referral_reward ?? 0,
    spent,
    currentBalance: activeBalances.reduce((sum, balance) => sum + balance, 0),
    customersWithBalance: activeBalances.length,
    creditedCustomers: creditedUsers.size,
    balancesByUser: Object.fromEntries(balances),
    unlinkedOrders,
    unlinkedAmount,
    missingOrders,
    inconsistentOrders,
  }, { headers: { "cache-control": "no-store" } });
}
