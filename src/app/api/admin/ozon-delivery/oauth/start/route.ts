import { NextRequest, NextResponse } from "next/server";

import { getOzonDeliveryGatewayAuthorizeUrl } from "@/lib/ozonDeliveryGateway";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function POST(request: NextRequest) {
  if (!ADMIN_PASSWORD || request.headers.get("x-admin-password") !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ authorizeUrl: getOzonDeliveryGatewayAuthorizeUrl() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось начать подключение Ozon Доставки" }, { status: 503 });
  }
}
