import { NextRequest, NextResponse } from "next/server";

import { ensureOrderReward, getBonusBalance } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const db = getServerSupabase();
  if (!token || !db) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const email = String(data.user.email || "").trim().toLowerCase();
    if (email) {
      const { data: paidOrders, error: ordersError } = await db
        .from("payment_orders")
        .select("id, user_id, amount_kopecks")
        .eq("status", "paid")
        .ilike("customer->>email", email);
      if (ordersError) throw new Error(ordersError.message);
      for (const order of paidOrders || []) {
        if (order.user_id && String(order.user_id) !== data.user.id) continue;
        if (!order.user_id) await db.from("payment_orders").update({ user_id: data.user.id }).eq("id", order.id).is("user_id", null);
        await ensureOrderReward(db, { id: String(order.id), userId: data.user.id, amountKopecks: Number(order.amount_kopecks) });
      }
    }
    const basePoints = Number(data.user.user_metadata?.bonusPoints || 0);
    const [bonusPoints, referrals] = await Promise.all([
      getBonusBalance(db, data.user.id, basePoints),
      db.from("payment_orders").select("id", { count: "exact", head: true }).eq("referral_owner_id", data.user.id).eq("status", "paid"),
    ]);
    if (referrals.error) throw new Error(referrals.error.message);
    return NextResponse.json({ bonusPoints, referralOrders: referrals.count || 0 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось получить бонусы" }, { status: 500 });
  }
}
