import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// Публичное чтение всех товаров (используется сайтом как запасной путь).
export async function GET() {
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { data, error } = await db.from("products").select("data");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ products: (data ?? []).map((r) => r.data) });
}

// Запись из админки: требует пароль. op = upsert | delete | seed
export async function POST(req: NextRequest) {
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let body: { password?: string; op?: string; product?: unknown; id?: string; products?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  if (!ADMIN_PASSWORD || body.password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date().toISOString();

  if (body.op === "upsert" && body.product) {
    const p = body.product as { id: string };
    const { error } = await db.from("products").upsert({ id: p.id, data: p, updated_at: now });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.op === "delete" && body.id) {
    const { error } = await db.from("products").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.op === "seed" && Array.isArray(body.products)) {
    const rows = (body.products as { id: string }[]).map((p) => ({ id: p.id, data: p, updated_at: now }));
    const { error } = await db.from("products").upsert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: rows.length });
  }

  return NextResponse.json({ error: "unknown_op" }, { status: 400 });
}
