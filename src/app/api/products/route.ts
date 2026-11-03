import { NextRequest, NextResponse } from "next/server";
import { getServerSupabase } from "@/lib/supabaseServer";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { HEALTH_BUNDLE_ID, withBundleAvailability } from "@/lib/bundle";
import type { Product } from "@/lib/products";

// Последняя успешная версия каталога остаётся в памяти процесса. Это даёт витрине
// актуальные цены при единичном сбое сети между сервером и Supabase.
let lastKnownProducts: unknown[] | null = null;

// Публичное чтение всех товаров (используется сайтом как запасной путь).
export async function GET(req: NextRequest) {
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  try {
    const { data, error } = await db.from("products").select("data");
    if (error) throw error;
    const products = withBundleAvailability((data ?? []).map((r) => r.data as Product));
    lastKnownProducts = products;
    return NextResponse.json({ products: isAdminAuthorized(req) ? products : products.filter((product) => product?.category === "bads") }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    if (lastKnownProducts) {
      return NextResponse.json(
        { products: isAdminAuthorized(req) ? lastKnownProducts : lastKnownProducts.filter((product) => (product as { category?: string })?.category === "bads"), stale: true },
        { headers: { "cache-control": "no-store", "x-vzbadrys-catalog-source": "last-known-good" } },
      );
    }
    console.error("Не удалось загрузить каталог", error);
    return NextResponse.json({ error: "catalogue_temporarily_unavailable" }, { status: 503 });
  }
}

// Запись из админки: требует пароль. Складские поля нельзя перезаписать
// устаревшей копией карточки из открытой вкладки браузера.
export async function POST(req: NextRequest) {
  let body: { op?: string; product?: unknown; id?: string; products?: unknown[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  if (!isAdminAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const now = new Date().toISOString();

  if (body.op === "upsert" && body.product) {
    const p = body.product as { id: string };
    const { data: current } = await db.from("products").select("data").eq("id", p.id).maybeSingle();
    const currentProduct = (current?.data ?? {}) as Record<string, unknown>;
    const nextProduct = {
      ...(p as Record<string, unknown>),
      ...(typeof currentProduct.stockQty === "number" ? { stockQty: currentProduct.stockQty } : {}),
      ...(typeof currentProduct.inStock === "boolean" ? { inStock: currentProduct.inStock } : {}),
      ...(p.id === HEALTH_BUNDLE_ID && typeof currentProduct.bundleEnabled === "boolean"
        ? { bundleEnabled: currentProduct.bundleEnabled }
        : {}),
    };
    const { error } = await db.from("products").upsert({ id: p.id, data: nextProduct, updated_at: now });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.op === "toggleStock" && body.id) {
    const { data: current, error: readError } = await db.from("products").select("data").eq("id", body.id).maybeSingle();
    if (readError || !current) return NextResponse.json({ error: "Товар не найден" }, { status: 404 });
    const product = current.data as Record<string, unknown>;
    const isBundle = body.id === HEALTH_BUNDLE_ID;
    const nextValue = isBundle ? !(product.bundleEnabled !== false) : !Boolean(product.inStock);
    const { data: partRows, error: partsError } = isBundle
      ? await db.from("products").select("data").in("id", ["magniy-citrat-b6", "magniy-bisglitinat", "selen-tsink"])
      : { data: null, error: null };
    if (partsError) return NextResponse.json({ error: partsError.message }, { status: 500 });
    const { error } = await db.from("products").update({
      data: isBundle ? { ...product, bundleEnabled: nextValue } : { ...product, inStock: nextValue }, updated_at: now,
    }).eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!isBundle) return NextResponse.json({ ok: true, inStock: nextValue });
    const bundle = withBundleAvailability([
      { ...product, id: HEALTH_BUNDLE_ID, bundleEnabled: nextValue } as Product,
      ...(partRows ?? []).map((row) => row.data as Product),
    ]).find((item) => item.id === HEALTH_BUNDLE_ID);
    return NextResponse.json({ ok: true, inStock: Boolean(bundle?.inStock) });
  }

  if (body.op === "delete" && body.id) {
    const { error } = await db.from("products").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.op === "seed" && Array.isArray(body.products)) {
    const ids = (body.products as { id: string }[]).map((product) => product.id);
    const { data: currentRows } = await db.from("products").select("id,data").in("id", ids);
    const currentById = new Map((currentRows ?? []).map((row) => [String(row.id), (row.data ?? {}) as Record<string, unknown>]));
    const rows = (body.products as { id: string }[]).map((product) => {
      const currentProduct = currentById.get(product.id) ?? {};
      return {
        id: product.id,
        data: {
          ...(product as Record<string, unknown>),
          ...(typeof currentProduct.stockQty === "number" ? { stockQty: currentProduct.stockQty } : {}),
          ...(typeof currentProduct.inStock === "boolean" ? { inStock: currentProduct.inStock } : {}),
        },
        updated_at: now,
      };
    });
    const { error } = await db.from("products").upsert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, count: rows.length });
  }

  return NextResponse.json({ error: "unknown_op" }, { status: 400 });
}
