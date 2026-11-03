import { NextRequest, NextResponse } from "next/server";

import { normalizeCode } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { parsePromoProductIds } from "@/lib/promoRules";

type Database = NonNullable<ReturnType<typeof getServerSupabase>>;
const PROMO_COLUMNS = "id, code, owner_name, discount_percent, active, usage_count, max_uses, product_ids, expires_at, created_at";

async function validateProductScope(db: Database, productIds: string[] | null) {
  if (productIds === null) return true;
  const { data, error } = await db.from("products").select("id,data").in("id", productIds);
  return !error && data?.length === productIds.length
    && data.every((row) => (row.data as { category?: string })?.category === "bads");
}

function parseMaxUses(value: unknown) {
  return value === null || value === undefined ? null : value === 1 ? 1 : undefined;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { data, error } = await db.from("promo_codes").select(PROMO_COLUMNS).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ promos: data || [] });
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const code = normalizeCode(typeof body.code === "string" ? body.code : "");
  const discount = Number(body.discountPercent);
  const expiryInput = typeof body.expiresAt === "string" ? body.expiresAt.trim() : "";
  const parsedExpiry = expiryInput
    ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(expiryInput) ? `${expiryInput}T23:59:59+03:00` : expiryInput)
    : null;
  const expiresAt = parsedExpiry && !Number.isNaN(parsedExpiry.getTime()) ? parsedExpiry.toISOString() : null;
  const ownerName = typeof body.ownerName === "string" && body.ownerName.trim() ? body.ownerName.trim().slice(0, 120) : null;
  const maxUses = parseMaxUses(body.maxUses);
  const productIds = body.productIds === undefined ? null : parsePromoProductIds(body.productIds);
  if (!code || !/^[A-ZА-ЯЁ0-9_-]{3,40}$/u.test(code)) return NextResponse.json({ error: "Код: от 3 до 40 букв, цифр, _ или -" }, { status: 400 });
  if (!Number.isInteger(discount) || discount < 1 || discount > 90) return NextResponse.json({ error: "Скидка должна быть от 1 до 90%" }, { status: 400 });
  if (parsedExpiry && !expiresAt) return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
  if (expiresAt && new Date(expiresAt).getTime() <= Date.now()) return NextResponse.json({ error: "Дата окончания уже прошла" }, { status: 400 });
  if (maxUses === undefined) return NextResponse.json({ error: "Выберите разовый или многоразовый промокод" }, { status: 400 });
  if (productIds === undefined || !await validateProductScope(db, productIds)) return NextResponse.json({ error: "Выберите существующие товары для промокода" }, { status: 400 });
  const { data, error } = await db.from("promo_codes").insert({ code, owner_name: ownerName, discount_percent: discount, max_uses: maxUses, product_ids: productIds, expires_at: expiresAt }).select(PROMO_COLUMNS).single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Такой промокод уже есть" : error.message }, { status: 400 });
  return NextResponse.json({ promo: data });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== "string" || !body.id || (body.active === undefined && body.maxUses === undefined && body.productIds === undefined)) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const changes: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    changes.active = body.active;
  }
  if (body.maxUses !== undefined) {
    const maxUses = parseMaxUses(body.maxUses);
    if (maxUses === undefined) return NextResponse.json({ error: "Выберите разовый или многоразовый промокод" }, { status: 400 });
    changes.max_uses = maxUses;
  }
  if (body.productIds !== undefined) {
    const productIds = parsePromoProductIds(body.productIds);
    if (productIds === undefined || !await validateProductScope(db, productIds)) return NextResponse.json({ error: "Выберите существующие товары для промокода" }, { status: 400 });
    changes.product_ids = productIds;
  }
  const { error } = await db.from("promo_codes").update(changes).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { error } = await db.from("promo_codes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
