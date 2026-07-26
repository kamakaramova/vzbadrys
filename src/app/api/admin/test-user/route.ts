import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabaseServer";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

function isAuthorized(request: NextRequest) {
  return Boolean(ADMIN_PASSWORD && request.headers.get("x-admin-password") === ADMIN_PASSWORD);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const suffix = Date.now().toString().slice(-6);
  const email = `test-${suffix}@mail.xn--80abckmj9cj3h.xn--p1ai`;
  const password = `Vz!${randomBytes(8).toString("base64url")}`;
  const referralCode = `TEST${suffix}`;
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: "Тестовый покупатель",
      phone: "+7 (900) 000-00-00",
      avatar: "",
      bonusPoints: 0,
      referralCode,
      favorites: [],
    },
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message || "create_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    credentials: { email, password },
  });
}
