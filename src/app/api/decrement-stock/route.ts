import { NextResponse } from "next/server";

// Прямое публичное списание отключено. Остатки меняются только после
// проверенного сервером уведомления об успешной оплате от Ozon.
export async function POST() {
  return NextResponse.json({ error: "gone" }, { status: 410 });
}
