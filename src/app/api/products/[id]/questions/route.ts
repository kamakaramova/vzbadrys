import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { id } = await params;
  const { data, error } = await db.from("product_questions")
    .select("id, author_name, body, answer, answered_at, created_at")
    .eq("product_id", id).eq("is_published", true).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Не удалось загрузить вопросы" }, { status: 500 });
  return NextResponse.json({ questions: data || [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limit = rateLimit(request, "product-question", 10, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Слишком много вопросов. Попробуйте позже" }, { status: 429, headers: { "retry-after": String(limit.retryAfter) } });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "База данных не настроена" }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  const user = await getAuthenticatedUser(db, token);
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const text = String(body.body || "").trim();
  const name = String(body.name || user?.user_metadata?.name || user?.email?.split("@")[0] || "").trim();
  const email = String(body.email || user?.email || "").trim().toLowerCase();
  if (text.length < 3 || text.length > 1500) return NextResponse.json({ error: "Вопрос должен содержать от 3 до 1500 символов" }, { status: 400 });
  if (name.length < 2 || name.length > 120) return NextResponse.json({ error: "Укажите имя" }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return NextResponse.json({ error: "Укажите корректный e-mail" }, { status: 400 });
  const { data, error } = await db.from("product_questions").insert({
    product_id: id, user_id: user?.id || null, author_name: name, author_email: email, body: text,
  }).select("id, author_name, body, answer, answered_at, created_at").single();
  if (error) return NextResponse.json({ error: "Не удалось отправить вопрос" }, { status: 500 });
  return NextResponse.json({ question: data });
}
