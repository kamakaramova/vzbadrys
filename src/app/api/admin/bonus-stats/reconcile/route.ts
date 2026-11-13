import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/adminAuth";
import { ensureOrderReward, ORDER_BONUS_PERCENT } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";

type OrderRow = {
  id: string;
  amount_kopecks: number | null;
  user_id: string | null;
  customer: unknown;
};

type LedgerRow = {
  id: string;
  user_id: string;
  amount: number | null;
  kind: string;
  order_id: string | null;
  status: string;
  created_at: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function expectedReward(order: OrderRow) {
  return Math.floor((Number(order.amount_kopecks || 0) / 100) * ORDER_BONUS_PERCENT / 100);
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const body = await request.json().catch(() => ({})) as { fixExcess?: boolean };
  const fixExcess = body.fixExcess === true;

  const [{ data: orders, error: ordersError }, { data: ledger, error: ledgerError }] = await Promise.all([
    db.from("payment_orders").select("id,amount_kopecks,user_id,customer").eq("status", "paid"),
    db.from("bonus_ledger").select("id,user_id,amount,kind,order_id,status,created_at"),
  ]);
  if (ordersError || ledgerError) {
    return NextResponse.json({ error: ordersError?.message || ledgerError?.message || "bonus_reconciliation_failed" }, { status: 500 });
  }

  const usersByEmail = new Map<string, string>();
  const baseBalances = new Map<string, number>();
  let page = 1;
  while (page <= 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: "accounts_unavailable" }, { status: 503 });
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

  const balances = new Map(baseBalances);
  for (const entry of entries) {
    if (["posted", "reserved"].includes(entry.status)) {
      balances.set(entry.user_id, (balances.get(entry.user_id) ?? 0) + Number(entry.amount || 0));
    }
  }

  let linkedOrders = 0;
  let createdRewards = 0;
  let createdAmount = 0;
  let reversedRewards = 0;
  let reversedAmount = 0;
  const skippedExcess: Array<{ orderId: string; amount: number; reason: string }> = [];

  for (const order of (orders ?? []) as OrderRow[]) {
    const expected = expectedReward(order);
    const customer = asRecord(order.customer);
    const email = String(customer.email ?? "").trim().toLowerCase();
    const userId = order.user_id || usersByEmail.get(email) || "";
    if (!userId) continue;

    if (!order.user_id) {
      const { data: linked, error } = await db
        .from("payment_orders")
        .update({ user_id: userId })
        .eq("id", order.id)
        .is("user_id", null)
        .select("id")
        .maybeSingle();
      if (error) return NextResponse.json({ error: "order_link_failed", orderId: order.id }, { status: 500 });
      if (linked) linkedOrders += 1;
    }

    const activeRewards = (rewardsByOrder.get(order.id) ?? []).filter((entry) => ["posted", "reserved"].includes(entry.status));
    if (expected > 0 && activeRewards.length === 0) {
      const result = await ensureOrderReward(db, { id: order.id, userId, amountKopecks: Number(order.amount_kopecks || 0) });
      if (result.created) {
        createdRewards += 1;
        createdAmount += result.reward;
        balances.set(userId, (balances.get(userId) ?? 0) + result.reward);
      }
      continue;
    }

    const postedRewards = activeRewards.filter((entry) => entry.status === "posted");
    const posted = postedRewards.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
    const excess = posted - expected;
    if (!fixExcess || excess <= 0) continue;

    const newestFirst = [...postedRewards].sort((left, right) => right.created_at.localeCompare(left.created_at));
    const toReverse: LedgerRow[] = [];
    let selectedAmount = 0;
    for (const entry of newestFirst) {
      if (selectedAmount >= excess) break;
      const amount = Number(entry.amount || 0);
      if (amount <= 0 || selectedAmount + amount > excess) break;
      toReverse.push(entry);
      selectedAmount += amount;
    }
    if (!toReverse.length || selectedAmount !== excess) {
      skippedExcess.push({ orderId: order.id, amount: excess, reason: "manual_amount_required" });
      continue;
    }

    const earliestCandidate = toReverse.reduce((earliest, entry) => entry.created_at < earliest ? entry.created_at : earliest, toReverse[0].created_at);
    const spentAfterDuplicate = entries.some((entry) =>
      entry.user_id === userId
      && entry.kind === "order_payment"
      && ["posted", "reserved"].includes(entry.status)
      && Number(entry.amount || 0) < 0
      && entry.created_at > earliestCandidate
    );
    if (spentAfterDuplicate || (balances.get(userId) ?? 0) < excess) {
      skippedExcess.push({ orderId: order.id, amount: excess, reason: spentAfterDuplicate ? "already_spent" : "insufficient_balance" });
      continue;
    }

    const { data: reversed, error } = await db
      .from("bonus_ledger")
      .update({ status: "reversed" })
      .in("id", toReverse.map((entry) => entry.id))
      .eq("status", "posted")
      .select("id");
    if (error || (reversed?.length ?? 0) !== toReverse.length) {
      return NextResponse.json({ error: "excess_reversal_failed", orderId: order.id }, { status: 500 });
    }
    reversedRewards += toReverse.length;
    reversedAmount += excess;
    balances.set(userId, (balances.get(userId) ?? 0) - excess);
  }

  return NextResponse.json({
    ok: true,
    linkedOrders,
    createdRewards,
    createdAmount,
    reversedRewards,
    reversedAmount,
    skippedExcess,
  }, { headers: { "cache-control": "no-store" } });
}
