import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { id } = await params;
  const { data, error } = await db.from("product_questions").select("id, author_name, body, created_at").eq("product_id", id).order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Не удалось загрузить вопросы" }, { status: 500 });
  return NextResponse.json({ questions: data || [] });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "База данных не настроена" }, { status: 503 });
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  const user = await getAuthenticatedUser(db, token);
  if (!user) return NextResponse.json({ error: "Войдите в личный кабинет, чтобы задать вопрос" }, { status: 401 });
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const text = String(body.body || "").trim();
  if (text.length < 3 || text.length > 1500) return NextResponse.json({ error: "Вопрос должен содержать от 3 до 1500 символов" }, { status: 400 });
  const { data, error } = await db.from("product_questions").insert({
    product_id: id, user_id: user.id, author_name: String(user.user_metadata?.name || user.email?.split("@")[0] || "Покупатель"), body: text,
  }).select("id, author_name, body, created_at").single();
  if (error) return NextResponse.json({ error: "Не удалось отправить вопрос" }, { status: 500 });
  return NextResponse.json({ question: data });
}
