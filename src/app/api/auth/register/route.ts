import { NextRequest, NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send";
import { confirmationEmail } from "@/lib/email/templates";
import { getServerSupabase } from "@/lib/supabaseServer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  let body: { name?: string; email?: string; phone?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  }

  const name = body.name?.trim() || "";
  const email = body.email?.trim().toLowerCase() || "";
  const phone = body.phone?.trim() || "";
  const password = body.password || "";
  if (!name || !phone || !EMAIL_RE.test(email) || password.length < 8) {
    return NextResponse.json(
      { error: "Проверьте имя, телефон, email и пароль: пароль должен содержать минимум 8 символов" },
      { status: 400 }
    );
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "Регистрация пока не настроена" }, { status: 503 });

  const referralCode = `VZB${crypto.randomUUID().replaceAll("-", "").slice(0, 7).toUpperCase()}`;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://xn--80abckmj9cj3h.xn--p1ai").replace(/\/$/, "");
  const { data, error } = await db.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo: `${siteUrl}/account`,
      data: {
        name,
        phone,
        avatar: "",
        bonusPoints: 0,
        referralCode,
        favorites: [],
      },
    },
  });

  if (error || !data.properties?.action_link) {
    const duplicate = error?.message.toLowerCase().includes("already");
    return NextResponse.json(
      { error: duplicate ? "Аккаунт с таким email уже существует" : "Не удалось создать аккаунт" },
      { status: duplicate ? 409 : 500 }
    );
  }

  const message = confirmationEmail(email, data.properties.action_link);
  try {
    await sendEmail({
      db,
      to: email,
      subject: message.subject,
      html: message.html,
      kind: "auth_confirmation",
      dedupeKey: `signup:${data.user.id}`,
    });
  } catch {
    await db.auth.admin.deleteUser(data.user.id);
    return NextResponse.json({ error: "Не удалось отправить письмо подтверждения" }, { status: 502 });
  }

  return NextResponse.json({ ok: true, requiresEmailConfirmation: true });
}
