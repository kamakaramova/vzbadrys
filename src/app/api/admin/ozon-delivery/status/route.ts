import { NextRequest, NextResponse } from "next/server";

import { getOzonDeliveryGatewayStatusUrl } from "@/lib/ozonDeliveryGateway";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

export async function GET(request: NextRequest) {
  if (!ADMIN_PASSWORD || request.headers.get("x-admin-password") !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(getOzonDeliveryGatewayStatusUrl(), {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.connected) {
      return NextResponse.json({ error: "Ozon пока не подтвердил доступ к логистике", ozonStatus: data.ozonStatus }, { status: 502 });
    }
    return NextResponse.json({ connected: true, ozonStatus: data.ozonStatus }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Защищённый сервер доставки недоступен" }, { status: 503 });
  }
}
