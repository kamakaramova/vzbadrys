import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getOzonDeliveryAuthorizeUrl } from "@/lib/ozonDeliveryOAuth";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request: NextRequest) {
  if (!ADMIN_PASSWORD || request.headers.get("x-admin-password") !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const state = randomUUID();
    const response = NextResponse.json({ authorizeUrl: getOzonDeliveryAuthorizeUrl(state) });
    response.cookies.set("ozon_delivery_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/ozon/delivery/oauth/callback",
      maxAge: 10 * 60,
    });
    return response;
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось начать подключение Ozon Доставки" }, { status: 503 });
  }
}
