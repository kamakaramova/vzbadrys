import { NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";

const noStoreHeaders = { "cache-control": "no-store, max-age=0" };

export async function GET() {
  const db = getServerSupabase();
  if (!db) {
    return NextResponse.json(
      { ok: false, checks: { app: "ok", database: "not_configured" } },
      { status: 503, headers: noStoreHeaders }
    );
  }

  try {
    const { error } = await db.from("products").select("id").limit(1);
    if (error) throw error;

    return NextResponse.json(
      { ok: true, checks: { app: "ok", database: "ok" } },
      { headers: noStoreHeaders }
    );
  } catch {
    return NextResponse.json(
      { ok: false, checks: { app: "ok", database: "error" } },
      { status: 503, headers: noStoreHeaders }
    );
  }
}
