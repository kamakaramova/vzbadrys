import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const BENEFITS = new Set(["Кожа", "Волосы", "Ногти", "Суставы", "Комплексный эффект"]);
const FLAVORS = new Set(["Нейтральный", "Манго", "Гранат", "Вишня", "Чёрная смородина", "Апельсин", "Шиповник", "Женьшень", "Персик", "Киви"]);
const FORMATS = new Set(["Порошок в банке", "Порошок в стиках", "Питьевой в стиках", "Желе в банке", "Желе в стиках"]);

async function authorizedUser(request: NextRequest) {
  const db = getServerSupabase();
  if (!db) return { db: null, user: null };
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
  return { db, user: await getAuthenticatedUser(db, token) };
}

function readResponse(metadata: Record<string, unknown> | undefined) {
  const value = metadata?.collagenSurvey;
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const benefits = Array.isArray(record.benefits)
    ? [...new Set(record.benefits.filter((item): item is string => typeof item === "string" && BENEFITS.has(item)))]
    : [];
  const flavor = typeof record.flavor === "string" && FLAVORS.has(record.flavor) ? record.flavor : "";
  const format = typeof record.format === "string" && FORMATS.has(record.format) ? record.format : "";
  if (!benefits.length || !flavor || !format) return null;
  return { benefits, flavor, format, updated_at: typeof record.updatedAt === "string" ? record.updatedAt : null };
}

export async function GET(request: NextRequest) {
  const { db, user } = await authorizedUser(request);
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ response: readResponse(user.user_metadata) }, { headers: { "cache-control": "no-store" } });
}

export async function PUT(request: NextRequest) {
  const { db, user } = await authorizedUser(request);
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const benefits = Array.isArray(body.benefits)
    ? [...new Set(body.benefits.filter((value: unknown): value is string => typeof value === "string" && BENEFITS.has(value)))]
    : [];
  const flavor = typeof body.flavor === "string" ? body.flavor : "";
  const format = typeof body.format === "string" ? body.format : "";
  if (benefits.length < 1 || benefits.length > 2 || !FLAVORS.has(flavor) || !FORMATS.has(format)) {
    return NextResponse.json({ error: "Выберите до двух целей, один вкус и один формат" }, { status: 400 });
  }
  const updatedAt = new Date().toISOString();
  const { error } = await db.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, collagenSurvey: { benefits, flavor, format, updatedAt } },
  });
  if (error) return NextResponse.json({ error: "Не удалось сохранить голосование" }, { status: 500 });
  return NextResponse.json({ response: { benefits, flavor, format, updated_at: updatedAt } });
}
