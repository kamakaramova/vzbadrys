import { createClient } from "@supabase/supabase-js";

const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !secret) {
  console.error("Bonus backfill: database environment is not configured");
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const usersByEmail = new Map();
let page = 1;
while (page <= 20) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  for (const user of data.users) {
    if (user.email_confirmed_at && user.email) usersByEmail.set(user.email.trim().toLowerCase(), user.id);
  }
  if (data.users.length < 1000) break;
  page += 1;
}

const { data: orders, error: ordersError } = await db
  .from("payment_orders")
  .select("id, user_id, amount_kopecks, customer")
  .eq("status", "paid");
if (ordersError) throw ordersError;
const { data: rewards, error: rewardsError } = await db
  .from("bonus_ledger")
  .select("order_id")
  .eq("kind", "order_reward");
if (rewardsError) throw rewardsError;

const rewardedOrders = new Set((rewards || []).map((row) => String(row.order_id)));
const candidates = [];
let withoutAccount = 0;
for (const order of orders || []) {
  if (rewardedOrders.has(String(order.id))) continue;
  const customer = order.customer || {};
  const email = String(customer.email || "").trim().toLowerCase();
  const userId = order.user_id ? String(order.user_id) : usersByEmail.get(email);
  if (!userId) { withoutAccount += 1; continue; }
  const reward = Math.floor((Number(order.amount_kopecks) / 100) * 0.01);
  if (reward > 0) candidates.push({ orderId: String(order.id), userId, reward, needsLink: !order.user_id });
}

console.info(JSON.stringify({ mode: apply ? "apply" : "audit", paidOrders: orders?.length || 0, missingRewards: candidates.length, bonusTotal: candidates.reduce((sum, item) => sum + item.reward, 0), withoutConfirmedAccount: withoutAccount }));
if (!apply) process.exit(0);

let created = 0;
let linked = 0;
for (const candidate of candidates) {
  if (candidate.needsLink) {
    const { error } = await db.from("payment_orders").update({ user_id: candidate.userId }).eq("id", candidate.orderId).is("user_id", null);
    if (error) throw error;
    linked += 1;
  }
  const { data: existing, error: existingError } = await db.from("bonus_ledger").select("order_id").eq("order_id", candidate.orderId).eq("kind", "order_reward").maybeSingle();
  if (existingError) throw existingError;
  if (existing) continue;
  const { error } = await db.from("bonus_ledger").insert({ user_id: candidate.userId, amount: candidate.reward, kind: "order_reward", order_id: candidate.orderId, status: "posted" });
  if (error) throw error;
  created += 1;
}
console.info(JSON.stringify({ completed: true, created, linked }));
