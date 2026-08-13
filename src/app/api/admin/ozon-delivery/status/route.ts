import { NextRequest, NextResponse } from "next/server";

import { getOzonDeliveryGatewayStatusUrl } from "@/lib/ozonDeliveryGateway";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const response = await fetch(getOzonDeliveryGatewayStatusUrl(), {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.connected) {
      // Ответ Ozon (в том числе 403 по отдельному логистическому методу)
      // означает, что OAuth-токен уже был передан Ozon. Не показываем это как
      // «подключение не выполнено»: подключение и права конкретного метода —
      // разные состояния.
      if (typeof data.ozonStatus === "number") {
        return NextResponse.json({
          connected: true,
          logisticsVerified: false,
          ozonStatus: data.ozonStatus,
        }, { headers: { "cache-control": "no-store" } });
      }
      return NextResponse.json({ error: "Ozon пока не подтвердил доступ к логистике", ozonStatus: data.ozonStatus }, { status: 502 });
    }
    return NextResponse.json({ connected: true, logisticsVerified: true, ozonStatus: data.ozonStatus }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Защищённый сервер доставки недоступен" }, { status: 503 });
  }
}
