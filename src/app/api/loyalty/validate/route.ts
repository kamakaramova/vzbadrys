import { NextRequest, NextResponse } from "next/server";

import { findReferralOwner, getAuthenticatedUser, normalizeCode, REFERRAL_DISCOUNT_PERCENT } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
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
      .select("code, discount_percent, active, max_uses, usage_count, expires_at").eq("code", code).maybeSingle();
    if (error) return NextResponse.json({ error: "Не удалось проверить промокод" }, { status: 500 });
    const expired = data?.expires_at && new Date(data.expires_at).getTime() < Date.now();
    const exhausted = data?.max_uses != null && Number(data.usage_count) >= Number(data.max_uses);
    if (!data || !data.active || expired || exhausted) {
      return NextResponse.json({ error: "Промокод не найден или больше не действует" }, { status: 400 });
    }
    return NextResponse.json({ code: data.code, discountPercent: Number(data.discount_percent) });
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
