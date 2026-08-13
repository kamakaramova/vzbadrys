import { NextRequest, NextResponse } from "next/server";

import { sendEmail } from "@/lib/email/send";
import { manualEmail, testEmail } from "@/lib/email/templates";
import { getServerSupabase } from "@/lib/supabaseServer";
import { isAdminAuthorized } from "@/lib/adminAuth";

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const orderId = request.nextUrl.searchParams.get("orderId")?.trim();
  let query = db
    .from("email_logs")
    .select("id,recipient,subject,kind,order_id,status,error,created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (orderId) query = query.eq("order_id", orderId);
  const { data, error } = await query;
  if (error) {
    const missing = error.message.toLowerCase().includes("email_logs");
    return NextResponse.json(
      { error: missing ? "email_logs_not_created" : error.message, logs: [] },
      { status: missing ? 409 : 500 }
    );
  }
  return NextResponse.json({ logs: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  let body: { email?: string; subject?: string; message?: string; type?: "test" | "manual" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const recipient = body.email?.trim().toLowerCase() || "";
  if (!validEmail(recipient)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const isManual = body.type === "manual";
  const subject = body.subject?.trim() || "";
  const text = body.message?.trim() || "";
  if (isManual && (!subject || !text || subject.length > 160 || text.length > 6000)) {
    return NextResponse.json({ error: "Укажите тему до 160 символов и текст письма до 6000 символов" }, { status: 400 });
  }

  const message = isManual ? manualEmail(subject, text) : testEmail(recipient);
  try {
    const result = await sendEmail({
      db,
      to: recipient,
      subject: message.subject,
      html: message.html,
      kind: isManual ? "manual" : "test",
    });
    return NextResponse.json({ ok: true, id: result.id });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "send_failed" },
      { status: 500 }
    );
  }
}
