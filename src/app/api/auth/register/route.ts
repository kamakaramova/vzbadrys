import { NextRequest, NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send";
import { confirmationEmail } from "@/lib/email/templates";
import { getServerSupabase } from "@/lib/supabaseServer";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: NextRequest) {
  let body: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    privacyAccepted?: boolean;
    personalDataAccepted?: boolean;
    marketingAccepted?: boolean;
  };
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
  if (body.privacyAccepted !== true || body.personalDataAccepted !== true) {
    return NextResponse.json(
      { error: "Необходимо подтвердить согласия для регистрации" },
      { status: 400 }
    );
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "Регистрация пока не настроена" }, { status: 503 });

  const referralCode = `VZB${crypto.randomUUID().replaceAll("-", "").slice(0, 7).toUpperCase()}`;
  const consentAcceptedAt = new Date().toISOString();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://vzbadris.ru").replace(/\/$/, "");
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
        consents: {
          privacy: true,
          personalData: true,
          acceptedAt: consentAcceptedAt,
          marketing: body.marketingAccepted === true,
          marketingAcceptedAt: body.marketingAccepted === true ? consentAcceptedAt : null,
          marketingConsentVersion: body.marketingAccepted === true ? "2026-07-27" : null,
        },
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

  const actionUrl = new URL(data.properties.action_link);
  actionUrl.searchParams.set("redirect_to", `${siteUrl}/account`);
  const message = confirmationEmail(email, actionUrl.toString());
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
