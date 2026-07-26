import { NextRequest, NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabaseServer";

export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get("order") || "";
  if (!/^VZB-\d{8}-[A-F0-9]{8}$/.test(orderId)) {
    return NextResponse.json({ error: "bad_order" }, { status: 400 });
  }
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const { data, error } = await db
    .from("payment_orders")
    .select("id, status, is_test, paid_at")
    .eq("id", orderId)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json({
    orderId: data.id,
    status: data.status,
    isTest: data.is_test,
    paidAt: data.paid_at,
  });
}
