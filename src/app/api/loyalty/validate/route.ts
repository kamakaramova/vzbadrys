import { NextRequest, NextResponse } from "next/server";

import { findReferralOwner, getAuthenticatedUser, normalizeCode, productIdFromCartId, REFERRAL_DISCOUNT_PERCENT } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "validate-code", 30, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Слишком много проверок. Попробуйте позже" }, { status: 429 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "База данных не настроена" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const kind = body.kind === "referral" ? "referral" : "promo";
  const code = normalizeCode(typeof body.code === "string" ? body.code : "");
  if (!code) return NextResponse.json({ error: "Введите код" }, { status: 400 });

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  const user = await getAuthenticatedUser(db, token);
  if (kind === "promo") {
    const { data, error } = await db.from("promo_codes")
      .select("code, discount_percent, active, max_uses, usage_count, product_ids, expires_at").eq("code", code).maybeSingle();
    if (error) return NextResponse.json({ error: "Не удалось проверить промокод" }, { status: 500 });
    const expired = data?.expires_at && new Date(data.expires_at).getTime() < Date.now();
    if (!data || !data.active || expired) {
      return NextResponse.json({ error: "Промокод не найден или больше не действует" }, { status: 400 });
    }
    const productIds = Array.isArray(data.product_ids) ? data.product_ids as string[] : null;
    const cartIds = Array.isArray(body.items) ? body.items.map((item: { id?: unknown }) => item?.id).filter((id: unknown): id is string => typeof id === "string") : [];
    if (cartIds.length > 0 && productIds !== null && !cartIds.some((id: string) => productIds.includes(productIdFromCartId(id)))) {
      return NextResponse.json({ error: "Промокод не действует на товары в корзине" }, { status: 400 });
    }
    if (data.max_uses !== null) {
      const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      const [paid, pending] = await Promise.all([
        db.from("payment_orders").select("id", { count: "exact", head: true }).eq("promo_code", code).eq("status", "paid"),
        db.from("payment_orders").select("id", { count: "exact", head: true }).eq("promo_code", code)
          .in("status", ["creating", "awaiting_payment", "authorized", "processing_payment", "payment_processing_error"])
          .gte("created_at", recent),
      ]);
      if (paid.error || pending.error) return NextResponse.json({ error: "Не удалось проверить лимит промокода" }, { status: 500 });
      if (Math.max(Number(data.usage_count), paid.count ?? 0) + (pending.count ?? 0) >= Number(data.max_uses)) {
        return NextResponse.json({ error: "Промокод уже использован или ожидает оплаты" }, { status: 400 });
      }
    }
    return NextResponse.json({ code: data.code, discountPercent: Number(data.discount_percent), productIds });
  }

  try {
    const owner = await findReferralOwner(db, code);
    if (!owner || owner.id === user?.id) {
      return NextResponse.json({ error: owner ? "Нельзя применить собственный реферальный код" : "Реферальный код не найден" }, { status: 400 });
    }
    return NextResponse.json({ code, discountPercent: REFERRAL_DISCOUNT_PERCENT, ownerId: owner.id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось проверить код" }, { status: 500 });
  }
}
