import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";

// Списание остатков при заказе (действие покупателя, без пароля).
// items: [{ id: базовый id товара, amount: сколько списать (шт для БАД, граммы для семян) }]
export async function POST(req: NextRequest) {
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let body: { items?: { id: string; amount: number }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const items = body.items ?? [];
  if (items.length === 0) return NextResponse.json({ ok: true });

  const now = new Date().toISOString();
  const ids = [...new Set(items.map((i) => i.id))];
  const { data, error } = await db.from("products").select("id, data").in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const updates: { id: string; data: Record<string, unknown>; updated_at: string }[] = [];
  for (const row of data ?? []) {
    const product = row.data as { stockQty?: number; inStock?: boolean };
    if (typeof product.stockQty !== "number") continue; // остаток не отслеживается
    const totalAmount = items.filter((i) => i.id === row.id).reduce((s, i) => s + i.amount, 0);
    const newQty = Math.max(0, product.stockQty - totalAmount);
    updates.push({ id: row.id, data: { ...product, stockQty: newQty, inStock: newQty > 0 }, updated_at: now });
  }

  if (updates.length > 0) {
    const { error: upErr } = await db.from("products").upsert(updates);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
