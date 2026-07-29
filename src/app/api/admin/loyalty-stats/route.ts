import { NextRequest, NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabaseServer";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function isAuthorized(request: NextRequest) {
  return Boolean(ADMIN_PASSWORD && request.headers.get("x-admin-password") === ADMIN_PASSWORD);
}

type OrderRow = {
  id: string;
  amount_kopecks: number | null;
  promo_code: string | null;
  promo_discount_percent: number | null;
  referral_code: string | null;
  referral_owner_id: string | null;
  referral_discount_percent: number | null;
};

type PromoRow = {
  code: string;
  owner_name: string | null;
  discount_percent: number;
  active: boolean;
  usage_count: number;
};

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const [{ data: promoRows, error: promoError }, { data: orderRows, error: ordersError }] = await Promise.all([
    db.from("promo_codes").select("code, owner_name, discount_percent, active, usage_count"),
    db.from("payment_orders").select("id,amount_kopecks,promo_code,promo_discount_percent,referral_code,referral_owner_id,referral_discount_percent").eq("status", "paid"),
  ]);
  if (promoError || ordersError) {
    return NextResponse.json({ error: promoError?.message || ordersError?.message || "Не удалось загрузить статистику" }, { status: 500 });
  }

  const promoByCode = new Map<string, PromoRow>();
  for (const row of (promoRows ?? []) as PromoRow[]) promoByCode.set(row.code, row);

  const promoStats = new Map<string, { code: string; ownerName: string | null; discountPercent: number; active: boolean; paidOrders: number; revenue: number; recordedUses: number }>();
  const referralStats = new Map<string, { ownerId: string; code: string; discountPercent: number; paidOrders: number; revenue: number }>();

  for (const row of (orderRows ?? []) as OrderRow[]) {
    const total = Number(row.amount_kopecks || 0) / 100;
    if (row.promo_code) {
      const promo = promoByCode.get(row.promo_code);
      const current = promoStats.get(row.promo_code) ?? {
        code: row.promo_code,
        ownerName: promo?.owner_name ?? null,
        discountPercent: Number(row.promo_discount_percent || promo?.discount_percent || 0),
        active: Boolean(promo?.active),
        paidOrders: 0,
        revenue: 0,
        recordedUses: Number(promo?.usage_count || 0),
      };
      current.paidOrders += 1;
      current.revenue += total;
      promoStats.set(row.promo_code, current);
    }
    if (row.referral_owner_id && row.referral_code) {
      const current = referralStats.get(row.referral_owner_id) ?? {
        ownerId: row.referral_owner_id,
        code: row.referral_code,
        discountPercent: Number(row.referral_discount_percent || 5),
        paidOrders: 0,
        revenue: 0,
      };
      current.paidOrders += 1;
      current.revenue += total;
      referralStats.set(row.referral_owner_id, current);
    }
  }

  for (const promo of promoByCode.values()) {
    if (!promoStats.has(promo.code)) {
      promoStats.set(promo.code, {
        code: promo.code,
        ownerName: promo.owner_name,
        discountPercent: Number(promo.discount_percent),
        active: promo.active,
        paidOrders: 0,
        revenue: 0,
        recordedUses: Number(promo.usage_count || 0),
      });
    }
  }

  const users = new Map<string, { name: string; email: string }>();
  let page = 1;
  while (page <= 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: "Не удалось загрузить владельцев реферальных кодов" }, { status: 500 });
    for (const user of data.users) {
      users.set(user.id, {
        name: String(user.user_metadata?.name || user.email?.split("@")[0] || "Покупатель"),
        email: user.email || "",
      });
    }
    if (data.users.length < 1000) break;
    page += 1;
  }

  return NextResponse.json({
    promos: [...promoStats.values()].sort((a, b) => b.paidOrders - a.paidOrders || b.revenue - a.revenue || a.code.localeCompare(b.code)),
    referrals: [...referralStats.values()]
      .map((item) => ({ ...item, ownerName: users.get(item.ownerId)?.name || "Покупатель", ownerEmail: users.get(item.ownerId)?.email || "" }))
      .sort((a, b) => b.paidOrders - a.paidOrders || b.revenue - a.revenue || a.code.localeCompare(b.code)),
  });
}
