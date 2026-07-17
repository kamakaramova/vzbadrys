import { NextRequest, NextResponse } from "next/server";

// Проверка пароля админки — ТОЛЬКО на сервере.
// Пароль хранится в переменной окружения ADMIN_PASSWORD (не в коде, не виден в браузере).
export async function POST(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }
  let body: { password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (body.password && body.password === expected) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false }, { status: 401 });
}
