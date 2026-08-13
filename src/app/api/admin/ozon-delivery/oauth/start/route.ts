import { NextRequest, NextResponse } from "next/server";

import { getOzonDeliveryGatewayAuthorizeUrl } from "@/lib/ozonDeliveryGateway";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json({ authorizeUrl: getOzonDeliveryGatewayAuthorizeUrl() });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Не удалось начать подключение Ozon Доставки" }, { status: 503 });
  }
}
