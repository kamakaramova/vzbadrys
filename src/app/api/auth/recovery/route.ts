import { NextRequest, NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send";
import { recoveryEmail } from "@/lib/email/templates";
import { getServerSupabase } from "@/lib/supabaseServer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase() || "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Введите корректный email" }, { status: 400 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "Восстановление пока не настроено" }, { status: 503 });

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://xn--80abckmj9cj3h.xn--p1ai").replace(/\/$/, "");
  const { data, error } = await db.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${siteUrl}/auth/reset` },
  });

  // Не раскрываем, зарегистрирован ли адрес на сайте.
  if (error || !data.properties?.action_link) {
    return NextResponse.json({ ok: true });
  }

  const message = recoveryEmail(email, data.properties.action_link);
  await sendEmail({
    db,
    to: email,
    subject: message.subject,
    html: message.html,
    kind: "auth_recovery",
  }).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
