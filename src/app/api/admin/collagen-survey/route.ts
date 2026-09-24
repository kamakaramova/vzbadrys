import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/adminAuth";
import { getServerSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const BENEFITS = ["Кожа", "Волосы", "Ногти", "Суставы", "Комплексный эффект"];
const FLAVORS = ["Нейтральный", "Манго", "Гранат", "Вишня", "Чёрная смородина", "Апельсин", "Шиповник", "Женьшень", "Персик", "Киви"];
const FORMATS = ["Порошок в банке", "Порошок в стиках", "Желе в банке", "Желе в стиках"];

type Response = { benefits: string[] | null; flavor: string | null; format: string | null };

function count(options: string[], values: string[]) {
  return options.map((label) => ({ label, count: values.filter((value) => value === label).length }));
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const responses: Response[] = [];
  let page = 1;
  while (page <= 20) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: "Не удалось загрузить результаты голосования" }, { status: 500 });
    for (const user of data.users) {
      const survey = user.user_metadata?.collagenSurvey;
      if (!survey || typeof survey !== "object") continue;
      const record = survey as Record<string, unknown>;
      const benefits = Array.isArray(record.benefits) ? record.benefits.filter((item): item is string => typeof item === "string" && BENEFITS.includes(item)) : [];
      const flavor = typeof record.flavor === "string" && FLAVORS.includes(record.flavor) ? record.flavor : null;
      const format = typeof record.format === "string" && FORMATS.includes(record.format) ? record.format : null;
      if (benefits.length && flavor && format) responses.push({ benefits, flavor, format });
    }
    if (data.users.length < 1000) break;
    page += 1;
  }
  return NextResponse.json({
    participants: responses.length,
    benefits: count(BENEFITS, responses.flatMap((response) => response.benefits || [])),
    flavors: count(FLAVORS, responses.map((response) => response.flavor || "")),
    formats: count(FORMATS, responses.map((response) => response.format || "")),
  }, { headers: { "cache-control": "no-store" } });
}
