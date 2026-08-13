import type { SupabaseClient } from "@supabase/supabase-js";

export const REFERRAL_DISCOUNT_PERCENT = 5;
export const REFERRER_FIRST_ORDER_BONUS = 50;
export const ORDER_BONUS_PERCENT = 1;
export const REVIEW_BONUS = 20;
export const MAX_BONUS_PAYMENT_SHARE = 0.3;

export function normalizeCode(value: string | undefined) {
  return (value || "").trim().toUpperCase().replace(/\s+/g, "");
}

export async function getAuthenticatedUser(db: SupabaseClient, token: string | null) {
  if (!token) return null;
  const { data, error } = await db.auth.getUser(token);
  return error ? null : data.user || null;
}

export async function findReferralOwner(db: SupabaseClient, code: string) {
  if (!code) return null;
  let page = 1;
  while (page <= 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Не удалось проверить реферальный код");
    const owner = data.users.find((candidate) =>
      normalizeCode(String(candidate.user_metadata?.referralCode || "")) === code
    );
    if (owner) return owner;
    if (data.users.length < 1000) return null;
    page += 1;
  }
  return null;
}

export async function findConfirmedUserByEmail(db: SupabaseClient, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  let page = 1;
  while (page <= 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Не удалось найти аккаунт покупателя");
    const user = data.users.find((candidate) =>
      Boolean(candidate.email_confirmed_at)
      && String(candidate.email || "").trim().toLowerCase() === normalizedEmail
    );
    if (user) return user;
    if (data.users.length < 1000) return null;
    page += 1;
  }
  return null;
}

export async function ensureOrderReward(
  db: SupabaseClient,
  order: { id: string; userId: string; amountKopecks: number },
) {
  const reward = Math.floor((Number(order.amountKopecks) / 100) * ORDER_BONUS_PERCENT / 100);
  if (!order.userId || reward <= 0) return { created: false, reward: 0 };

  const { data: existing, error: existingError } = await db
    .from("bonus_ledger")
    .select("order_id")
    .eq("order_id", order.id)
    .eq("kind", "order_reward")
    .maybeSingle();
  if (existingError) throw new Error("Не удалось проверить бонусы за заказ");
  if (existing) return { created: false, reward };

  const { error } = await db.from("bonus_ledger").insert({
    user_id: order.userId,
    amount: reward,
    kind: "order_reward",
    order_id: order.id,
    status: "posted",
  });
  if (error) throw new Error("Не удалось начислить бонусы за заказ");
  return { created: true, reward };
}

export async function getBonusBalance(db: SupabaseClient, userId: string, basePoints = 0) {
  const { data, error } = await db
    .from("bonus_ledger")
    .select("amount, status")
    .eq("user_id", userId)
    .in("status", ["reserved", "posted"]);
  if (error) throw new Error("Не удалось получить баланс бонусов");
  return Math.max(0, Number(basePoints || 0) + (data || []).reduce((sum, row) => sum + Number(row.amount || 0), 0));
}

export function productIdFromCartId(cartId: string) {
  return cartId.match(/^(.+)-(\d+)g$/)?.[1] ?? cartId;
}
