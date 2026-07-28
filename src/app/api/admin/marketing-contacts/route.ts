import { NextRequest, NextResponse } from "next/server";

import { getServerSupabase } from "@/lib/supabaseServer";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

type MarketingContact = {
  email: string;
  name: string;
  phone: string;
  consentAt: string;
  source: "registration" | "order" | "registration_and_order";
};

function isAuthorized(request: NextRequest) {
  return Boolean(ADMIN_PASSWORD && request.headers.get("x-admin-password") === ADMIN_PASSWORD);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const contacts = new Map<string, MarketingContact>();
  const addContact = (contact: Omit<MarketingContact, "source">, source: "registration" | "order") => {
    const email = contact.email.trim().toLowerCase();
    if (!email) return;
    const existing = contacts.get(email);
    if (!existing) {
      contacts.set(email, { ...contact, email, source });
      return;
    }
    contacts.set(email, {
      ...existing,
      name: existing.name || contact.name,
      phone: existing.phone || contact.phone,
      consentAt: existing.consentAt > contact.consentAt ? existing.consentAt : contact.consentAt,
      source: existing.source === source ? source : "registration_and_order",
    });
  };

  let page = 1;
  while (true) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const users = data.users ?? [];
    for (const user of users) {
      const metadata = asRecord(user.user_metadata);
      const consents = asRecord(metadata.consents);
      if (consents.marketing !== true || !user.email) continue;
      addContact({
        email: user.email,
        name: String(metadata.name ?? ""),
        phone: String(metadata.phone ?? user.phone ?? ""),
        consentAt: String(consents.marketingAcceptedAt ?? consents.acceptedAt ?? user.created_at),
      }, "registration");
    }
    if (users.length < 1000) break;
    page += 1;
  }

  const { data: orders, error: ordersError } = await db
    .from("payment_orders")
    .select("customer,created_at");
  if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 });

  for (const order of orders ?? []) {
    const customer = asRecord(order.customer);
    const consent = asRecord(customer.marketingConsent);
    if (!consent.acceptedAt) continue;
    addContact({
      email: String(customer.email ?? ""),
      name: [customer.name, customer.surname].filter(Boolean).join(" "),
      phone: String(customer.phone ?? ""),
      consentAt: String(consent.acceptedAt ?? order.created_at),
    }, "order");
  }

  return NextResponse.json({
    contacts: [...contacts.values()].sort((a, b) => b.consentAt.localeCompare(a.consentAt)),
  });
}
