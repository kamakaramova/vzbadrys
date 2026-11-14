import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/adminAuth";
import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const PENDING_STATUSES = ["creating", "awaiting_payment", "authorized", "processing_payment"];

function isoBefore(milliseconds: number) {
  return new Date(Date.now() - milliseconds).toISOString();
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });

  const twoHoursAgo = isoBefore(2 * 60 * 60 * 1000);
  const oneDayAgo = isoBefore(24 * 60 * 60 * 1000);
  const thirtyDaysAgo = isoBefore(30 * 24 * 60 * 60 * 1000);

  const [stuckResult, processingErrorsResult, incompletePaidResult] = await Promise.all([
    db
      .from("payment_orders")
      .select("id", { count: "exact", head: true })
      .in("status", PENDING_STATUSES)
      .lt("updated_at", twoHoursAgo),
    db
      .from("payment_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "payment_processing_error")
      .gte("updated_at", oneDayAgo),
    db
      .from("payment_orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "paid")
      .gte("created_at", thirtyDaysAgo)
      .or("stock_written_off.eq.false,paid_at.is.null"),
  ]);

  if (stuckResult.error || processingErrorsResult.error || incompletePaidResult.error) {
    return NextResponse.json({ ok: false, error: "database_check_failed" }, { status: 503 });
  }

  const checks = {
    stuckPayments: stuckResult.count ?? 0,
    recentPaymentProcessingErrors: processingErrorsResult.count ?? 0,
    incompletePaidOrders: incompletePaidResult.count ?? 0,
  };
  const ok = Object.values(checks).every((count) => count === 0);

  return NextResponse.json(
    { ok, checks },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store, max-age=0" } }
  );
}
