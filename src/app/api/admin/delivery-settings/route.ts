import { NextRequest, NextResponse } from "next/server";

import { getDeliverySettings, sanitizeDeliverySettings } from "@/lib/deliverySettings";
import { getServerSupabase } from "@/lib/supabaseServer";
import { isAdminAuthorized } from "@/lib/adminAuth";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json(await getDeliverySettings());
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const settings = sanitizeDeliverySettings(await request.json().catch(() => null));
  if (!settings) return NextResponse.json({ error: "invalid_settings" }, { status: 400 });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const { error } = await db.from("delivery_settings").upsert({
    id: "main",
    enabled: settings.enabled,
    pochta_widget_id: settings.pochtaWidgetId,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    const missing = error.message.toLowerCase().includes("delivery_settings");
    return NextResponse.json({ error: missing ? "delivery_settings_not_created" : error.message }, { status: missing ? 409 : 500 });
  }
  return NextResponse.json(settings);
}
