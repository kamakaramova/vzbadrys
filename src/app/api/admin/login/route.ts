import { NextRequest, NextResponse } from "next/server";
import { clearAdminSessionCookie, isAdminAuthorized, setAdminSessionCookie, verifyAdminPassword } from "@/lib/adminAuth";
import { rateLimit } from "@/lib/rateLimit";

// Проверка пароля админки — ТОЛЬКО на сервере.
// Пароль хранится в переменной окружения ADMIN_PASSWORD (не в коде, не виден в браузере).
export async function POST(req: NextRequest) {
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  const attempt = rateLimit(req, "admin-login", 5, 15 * 60 * 1000);
  if (!attempt.allowed) {
    return NextResponse.json({ ok: false, error: "too_many_attempts" }, {
      status: 429,
      headers: { "retry-after": String(attempt.retryAfter) },
    });
  }
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (verifyAdminPassword(body.password)) {
    const response = NextResponse.json({ ok: true });
    setAdminSessionCookie(response);
    return response;
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearAdminSessionCookie(response);
  return response;
}

export async function GET(req: NextRequest) {
  const authorized = isAdminAuthorized(req);
  return NextResponse.json({ ok: authorized }, { status: authorized ? 200 : 401 });
}
