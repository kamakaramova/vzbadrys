import { NextRequest, NextResponse } from "next/server";

import { isAdminAuthorized } from "@/lib/adminAuth";
import { reviewAndCollagenEmail } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { getServerSupabase } from "@/lib/supabaseServer";

export const runtime = "nodejs";

const CAMPAIGN_KEY = "review-collagen-2026-09-24";
const MIN_DAYS_AFTER_DELIVERY = 7;

type Recipient = { email: string; name: string };

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function validEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

async function recipientsForCampaign() {
  const db = getServerSupabase();
  if (!db) throw new Error("not_configured");
  const consented = new Set<string>();
  let page = 1;
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data.users ?? [];
    for (const user of users) {
      const metadata = asRecord(user.user_metadata);
      if (asRecord(metadata.consents).marketing === true && user.email) consented.add(user.email.trim().toLowerCase());
    }
    if (users.length < 1000) break;
    page += 1;
  }

  const { data: orders, error } = await db
    .from("payment_orders")
    .select("status,customer,delivery,updated_at,created_at")
    .eq("status", "paid");
  if (error) throw error;

  const cutoff = Date.now() - MIN_DAYS_AFTER_DELIVERY * 24 * 60 * 60 * 1000;
  const recipients = new Map<string, Recipient>();
  for (const order of orders ?? []) {
    const delivery = asRecord(order.delivery);
    if (delivery.orderStatus !== "delivered") continue;
    const deliveredAt = new Date(String(order.updated_at ?? order.created_at)).getTime();
    if (!Number.isFinite(deliveredAt) || deliveredAt > cutoff) continue;
    const customer = asRecord(order.customer);
    const email = String(customer.email ?? "").trim().toLowerCase();
    const orderConsent = Boolean(asRecord(customer.marketingConsent).acceptedAt);
    if (!validEmail(email) || (!consented.has(email) && !orderConsent) || recipients.has(email)) continue;
    recipients.set(email, { email, name: [customer.name, customer.surname].filter(Boolean).join(" ").trim() });
  }
  return { db, recipients: [...recipients.values()] };
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const { recipients } = await recipientsForCampaign();
    return NextResponse.json({ recipients: recipients.length, minimumDaysAfterDelivery: MIN_DAYS_AFTER_DELIVERY });
  } catch {
    return NextResponse.json({ error: "Не удалось собрать получателей кампании" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  if (body.confirm !== "send") return NextResponse.json({ error: "confirmation_required" }, { status: 400 });
  try {
    const { db, recipients } = await recipientsForCampaign();
    let sent = 0;
    let skipped = 0;
    let failed = 0;
    for (const recipient of recipients) {
      const message = reviewAndCollagenEmail(recipient.name);
      try {
        const result = await sendEmail({
          db,
          to: recipient.email,
          subject: message.subject,
          html: message.html,
          kind: "marketing_review_collagen",
          dedupeKey: `${CAMPAIGN_KEY}:${recipient.email}`,
        });
        if (result.duplicate) skipped += 1;
        else sent += 1;
      } catch {
        failed += 1;
      }
    }
    return NextResponse.json({ recipients: recipients.length, sent, skipped, failed });
  } catch {
    return NextResponse.json({ error: "Не удалось отправить кампанию" }, { status: 500 });
  }
}
