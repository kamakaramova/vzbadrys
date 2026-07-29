import { NextRequest, NextResponse } from "next/server";

import { exchangeOzonDeliveryCode } from "@/lib/ozonDeliveryOAuth";
import { getServerSupabase } from "@/lib/supabaseServer";

function page(title: string, text: string, ok = false) {
  return new NextResponse(`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="margin:0;background:#fdfcfb;font-family:Arial,sans-serif;color:#1a1a1a"><main style="max-width:560px;margin:12vh auto;padding:32px;background:#fff;border:1px solid #f0e8e0;border-radius:24px;text-align:center"><div style="font-size:42px">${ok ? "✓" : "!"}</div><h1 style="font-size:24px">${title}</h1><p style="line-height:1.5;color:#6b6b6b">${text}</p></main></body></html>`, { headers: { "content-type": "text/html; charset=utf-8" } });
}

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const state = url.searchParams.get("state");
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error");
  const expectedState = request.cookies.get("ozon_delivery_oauth_state")?.value;
  if (error) return page("Подключение отменено", "Ozon не выдал доступ. Вернитесь в админку и попробуйте ещё раз.");
  if (!code || !state || !expectedState || state !== expectedState) return page("Не удалось подтвердить подключение", "Ссылка устарела или открыта в другом браузере. Запустите подключение из админки ещё раз.");

  const db = getServerSupabase();
  if (!db) return page("База данных не настроена", "Не удалось безопасно сохранить подключение.");
  try {
    const token = await exchangeOzonDeliveryCode(code);
    const { error: saveError } = await db.from("oauth_connections").upsert({
      provider: "ozon_delivery",
      access_token: token.accessToken,
      refresh_token: token.refreshToken,
      expires_at: token.expiresAt,
      scope: token.scope,
      updated_at: new Date().toISOString(),
    });
    if (saveError) throw new Error("Не удалось сохранить подключение");
    const response = page("Ozon Доставка подключена", "Доступ получен и сохранён. Можно закрыть эту страницу и вернуться в админку.", true);
    response.cookies.delete("ozon_delivery_oauth_state");
    return response;
  } catch (caught) {
    return page("Подключение не завершено", caught instanceof Error ? caught.message : "Попробуйте ещё раз из админки.");
  }
}
