import { NextResponse } from "next/server";

import { getDeliverySettings } from "@/lib/deliverySettings";

export async function GET() {
  return NextResponse.json(await getDeliverySettings(), {
    headers: { "cache-control": "no-store" },
  });
}
