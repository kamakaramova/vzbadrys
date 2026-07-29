import { NextRequest, NextResponse } from "next/server";

import { normalizeCode } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const allowed = (request: NextRequest) => Boolean(ADMIN_PASSWORD && request.headers.get("x-admin-password") === ADMIN_PASSWORD);

export async function GET(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { data, error } = await db.from("promo_codes").select("id, code, owner_name, discount_percent, active, usage_count, max_uses, expires_at, created_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ promos: data || [] });
}

export async function POST(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  const code = normalizeCode(typeof body.code === "string" ? body.code : "");
  const discount = Number(body.discountPercent);
  const expiresAt = typeof body.expiresAt === "string" && body.expiresAt ? new Date(body.expiresAt).toISOString() : null;
  const ownerName = typeof body.ownerName === "string" && body.ownerName.trim() ? body.ownerName.trim().slice(0, 120) : null;
  if (!code || !/^[A-ZА-ЯЁ0-9_-]{3,40}$/u.test(code)) return NextResponse.json({ error: "Код: от 3 до 40 букв, цифр, _ или -" }, { status: 400 });
  if (!Number.isInteger(discount) || discount < 1 || discount > 90) return NextResponse.json({ error: "Скидка должна быть от 1 до 90%" }, { status: 400 });
  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) return NextResponse.json({ error: "Некорректная дата" }, { status: 400 });
  const { data, error } = await db.from("promo_codes").insert({ code, owner_name: ownerName, discount_percent: discount, expires_at: expiresAt }).select("id, code, owner_name, discount_percent, active, usage_count, max_uses, expires_at, created_at").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Такой промокод уже есть" : error.message }, { status: 400 });
  return NextResponse.json({ promo: data });
}

export async function PATCH(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== "string" || typeof body.active !== "boolean") return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { error } = await db.from("promo_codes").update({ active: body.active, updated_at: new Date().toISOString() }).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const { error } = await db.from("promo_codes").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
