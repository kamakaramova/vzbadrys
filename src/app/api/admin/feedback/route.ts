import { NextRequest, NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabaseServer";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const allowed = (request: NextRequest) => Boolean(ADMIN_PASSWORD && request.headers.get("x-admin-password") === ADMIN_PASSWORD);

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const [reviewsResult, questionsResult] = await Promise.all([
    db.from("product_reviews")
      .select("id, product_id, order_id, author_name, author_email, rating, body, image_url, answer, answered_at, is_published, created_at")
      .order("created_at", { ascending: false }),
    db.from("product_questions")
      .select("id, product_id, user_id, author_name, author_email, body, answer, answered_at, is_published, created_at")
      .order("created_at", { ascending: false }),
  ]);
  if (reviewsResult.error || questionsResult.error) {
    return NextResponse.json({
      error: "Не удалось загрузить обращения. Проверьте, что SQL-обновление из supabase-setup.sql выполнено в Supabase.",
    }, { status: 500 });
  }
  return NextResponse.json({ reviews: reviewsResult.data || [], questions: questionsResult.data || [] });
}

export async function PATCH(request: NextRequest) {
  if (!allowed(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const type = body.type === "review" || body.type === "question" ? body.type : null;
  const id = typeof body.id === "string" ? body.id : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  const isPublished = typeof body.isPublished === "boolean" ? body.isPublished : null;
  if (!type || !id) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  if (answer.length > 3000) return NextResponse.json({ error: "Ответ не должен быть длиннее 3000 символов" }, { status: 400 });
  if (isPublished === null && !answer) return NextResponse.json({ error: "Напишите ответ или измените публикацию" }, { status: 400 });

  const table = type === "review" ? "product_reviews" : "product_questions";
  const update: Record<string, unknown> = {};
  if (isPublished !== null) update.is_published = isPublished;
  if (answer) {
    update.answer = answer;
    update.answered_at = new Date().toISOString();
    // Ответ на вопрос автоматически делает его видимым покупателям.
    if (type === "question" && isPublished === null) update.is_published = true;
  }
  const { data, error } = await db.from(table).update(update).eq("id", id)
    .select("id, answer, answered_at, is_published").single();
  if (error) return NextResponse.json({ error: "Не удалось сохранить ответ" }, { status: 500 });
  return NextResponse.json({ item: data });
}
