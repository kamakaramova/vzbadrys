import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser, productIdFromCartId, REVIEW_BONUS } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

function authorName(metadata: Record<string, unknown> | undefined, email: string | undefined) {
  return String(metadata?.name || email?.split("@")[0] || "Покупатель");
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { id } = await params;
  const { data, error } = await db.from("product_reviews")
    .select("id, author_name, rating, body, image_url, answer, answered_at, created_at")
    .eq("is_published", true)
    .eq("product_id", id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Не удалось загрузить отзывы" }, { status: 500 });
  return NextResponse.json({ reviews: data || [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "База данных не настроена" }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  const user = await getAuthenticatedUser(db, token);
  if (!user) return NextResponse.json({ error: "Войдите в личный кабинет, чтобы оставить отзыв" }, { status: 401 });
  const { id: productId } = await params;
  const body = await request.json().catch(() => ({}));
  const rating = Number(body.rating);
  const text = String(body.body || "").trim();
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return NextResponse.json({ error: "Поставьте оценку от 1 до 5" }, { status: 400 });
  if (text.length < 3 || text.length > 3000) return NextResponse.json({ error: "Текст отзыва должен содержать от 3 до 3000 символов" }, { status: 400 });

  const { data: orders, error: ordersError } = await db.from("payment_orders")
    .select("id, items").eq("user_id", user.id).eq("status", "paid");
  if (ordersError) return NextResponse.json({ error: "Не удалось проверить покупку" }, { status: 500 });
  const purchase = (orders || []).find((order) => ((order.items || []) as { cartId?: string; productId?: string }[])
    .some((item) => productIdFromCartId(String(item.cartId || item.productId || "")) === productId));
  if (!purchase) return NextResponse.json({ error: "Отзыв могут оставить только покупатели этого товара" }, { status: 403 });

  let imageUrl: string | null = null;
  const imageData = typeof body.imageData === "string" ? body.imageData : "";
  if (imageData) {
    const match = imageData.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
    if (!match) return NextResponse.json({ error: "Можно прикрепить JPG, PNG или WEBP" }, { status: 400 });
    const bytes = Buffer.from(match[2], "base64");
    if (bytes.length > 5 * 1024 * 1024) return NextResponse.json({ error: "Фото должно быть не больше 5 МБ" }, { status: 400 });
    const ext = match[1].split("/")[1] === "jpeg" ? "jpg" : match[1].split("/")[1];
    const path = `${productId}/${user.id}/${randomUUID()}.${ext}`;
    const upload = await db.storage.from("review-media").upload(path, bytes, { contentType: match[1], upsert: false });
    if (upload.error) return NextResponse.json({ error: "Не удалось загрузить фото" }, { status: 500 });
    imageUrl = db.storage.from("review-media").getPublicUrl(path).data.publicUrl;
  }

  const { data: review, error } = await db.from("product_reviews").insert({
    product_id: productId, user_id: user.id, order_id: purchase.id,
    author_name: authorName(user.user_metadata, user.email), author_email: user.email || null,
    rating, body: text, image_url: imageUrl,
  }).select("id, author_name, rating, body, image_url, answer, answered_at, created_at").single();
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Вы уже оставили отзыв на этот товар" : "Не удалось опубликовать отзыв" }, { status: 400 });
  await db.from("bonus_ledger").insert({ user_id: user.id, amount: REVIEW_BONUS, kind: "review_reward", order_id: purchase.id, product_id: productId, status: "posted" });
  return NextResponse.json({ review });
}
