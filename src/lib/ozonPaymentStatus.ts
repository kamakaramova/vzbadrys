import "server-only";

import { decrementProductStock } from "@/lib/stock";
import { emailAddressFromOrder, toEmailOrder, type PaymentOrderRow } from "@/lib/email/order";
import { sendEmail } from "@/lib/email/send";
import { orderEmail } from "@/lib/email/templates";
import { ORDER_BONUS_PERCENT, REFERRER_FIRST_ORDER_BONUS } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";

type Database = NonNullable<ReturnType<typeof getServerSupabase>>;

type ApplyPaymentStatusParams = {
  db: Database;
  ozonOrderId: string;
  externalOrderId?: string;
  status: string;
  transactionId?: string;
  paymentMethod?: string;
  isTest?: boolean;
  expectedAmount?: number;
  expectedCurrency?: string;
};

export type ApplyPaymentStatusResult = { ok: true; changed: boolean } | { ok: false; error: string };

/**
 * Единственная точка, в которой статус Ozon становится статусом заказа.
 * Её используют и подписанный webhook, и ручная сверка из админки.
 */
export async function applyOzonPaymentStatus({
  db,
  ozonOrderId,
  externalOrderId,
  status,
  transactionId: _transactionId,
  paymentMethod,
  isTest,
  expectedAmount,
  expectedCurrency,
}: ApplyPaymentStatusParams): Promise<ApplyPaymentStatusResult> {
  let orderQuery = db
    .from("payment_orders")
    .select("id, ozon_order_id, status, amount_kopecks, customer, items, delivery, stock_written_off, user_id, promo_code, referral_owner_id");
  orderQuery = externalOrderId
    ? orderQuery.eq("id", externalOrderId)
    : orderQuery.eq("ozon_order_id", ozonOrderId);
  const { data: order, error: orderError } = await orderQuery.maybeSingle();
  if (orderError || !order) return { ok: false, error: "order_not_found" };
  if (order.ozon_order_id && order.ozon_order_id !== ozonOrderId) return { ok: false, error: "order_mismatch" };
  if (expectedAmount != null && Number(order.amount_kopecks) !== expectedAmount) return { ok: false, error: "amount_mismatch" };
  if (expectedCurrency && expectedCurrency !== "643") return { ok: false, error: "currency_mismatch" };

  const normalizedStatus = status.trim().toLowerCase();
  const now = new Date().toISOString();

  if (["completed", "paid"].includes(normalizedStatus)) {
    if (order.status === "paid") return { ok: true, changed: false };

    const { data: claimed, error: claimError } = await db
      .from("payment_orders")
      .update({ status: "processing_payment", updated_at: now })
      .eq("id", order.id)
      .eq("status", order.status)
      .select("id")
      .maybeSingle();
    if (claimError) return { ok: false, error: "claim_failed" };
    if (!claimed) return { ok: true, changed: false };

    try {
      if (!order.stock_written_off) {
        const lines = (order.items ?? []) as { productId?: string; stockAmount?: number }[];
        await decrementProductStock(db, lines.map((line) => ({ id: line.productId || "", amount: Number(line.stockAmount) })));
      }
      const { error: paidError } = await db.from("payment_orders").update({
        status: "paid",
        ozon_order_id: ozonOrderId,
        payment_method: paymentMethod || null,
        is_test: Boolean(isTest),
        stock_written_off: true,
        paid_at: now,
        updated_at: now,
      }).eq("id", order.id);
      if (paidError) throw new Error(paidError.message);

      await db.from("bonus_ledger").update({ status: "posted" }).eq("order_id", order.id).eq("status", "reserved");
      if (order.user_id) {
        const orderBonus = Math.floor((Number(order.amount_kopecks) / 100) * ORDER_BONUS_PERCENT / 100);
        if (orderBonus > 0) {
          await db.from("bonus_ledger").insert({ user_id: order.user_id, amount: orderBonus, kind: "order_reward", order_id: order.id, status: "posted" });
        }
        if (order.referral_owner_id && order.referral_owner_id !== order.user_id) {
          const { error: rewardClaimError } = await db.from("referral_rewards").insert({
            referred_user_id: order.user_id,
            referrer_user_id: order.referral_owner_id,
            order_id: order.id,
          });
          if (!rewardClaimError) {
            await db.from("bonus_ledger").insert({
              user_id: order.referral_owner_id,
              amount: REFERRER_FIRST_ORDER_BONUS,
              kind: "referral_reward",
              order_id: order.id,
              status: "posted",
            });
          }
        }
      }
      if (order.promo_code) {
        const { data: promo } = await db.from("promo_codes").select("usage_count").eq("code", order.promo_code).maybeSingle();
        if (promo) await db.from("promo_codes").update({ usage_count: Number(promo.usage_count) + 1, updated_at: now }).eq("code", order.promo_code);
      }

      const emailOrder = toEmailOrder(order as PaymentOrderRow);
      const recipient = emailAddressFromOrder(order as PaymentOrderRow);
      if (recipient) {
        const message = orderEmail("paid", emailOrder);
        await sendEmail({ db, to: recipient, subject: message.subject, html: message.html, kind: "payment_paid", orderId: order.id, dedupeKey: `${order.id}:payment_paid` }).catch(() => undefined);
      }
      return { ok: true, changed: true };
    } catch {
      await db.from("payment_orders").update({ status: "payment_processing_error", updated_at: new Date().toISOString() }).eq("id", order.id);
      return { ok: false, error: "payment_processing_failed" };
    }
  }

  if (["rejected", "failed", "cancelled", "canceled"].includes(normalizedStatus)) {
    if (["payment_failed", "paid"].includes(String(order.status))) return { ok: true, changed: false };
    await db.from("bonus_ledger").update({ status: "reversed" }).eq("order_id", order.id).eq("status", "reserved");
    const { error } = await db.from("payment_orders").update({
      status: "payment_failed",
      payment_method: paymentMethod || null,
      is_test: Boolean(isTest),
      updated_at: now,
    }).eq("id", order.id).neq("status", "paid");
    return error ? { ok: false, error: "update_failed" } : { ok: true, changed: true };
  }

  if (["authorized", "authorised"].includes(normalizedStatus)) {
    if (["authorized", "paid"].includes(String(order.status))) return { ok: true, changed: false };
    const { error } = await db.from("payment_orders").update({
      status: "authorized",
      payment_method: paymentMethod || null,
      is_test: Boolean(isTest),
      updated_at: now,
    }).eq("id", order.id).neq("status", "paid");
    return error ? { ok: false, error: "update_failed" } : { ok: true, changed: true };
  }

  return { ok: true, changed: false };
}
