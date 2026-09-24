import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error("Database environment is not configured");
  process.exit(1);
}

const db = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(value).trim());
const asRecord = (value) => value && typeof value === "object" ? value : {};
const normalize = (value) => String(value ?? "").trim().toLowerCase();

const allPeople = new Set();
const purchasers = new Set();
const consented = new Set();

for (let page = 1; page <= 20; page += 1) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  const users = data.users ?? [];
  for (const user of users) {
    const email = normalize(user.email);
    if (!validEmail(email)) continue;
    allPeople.add(email);
    if (asRecord(asRecord(user.user_metadata).consents).marketing === true) consented.add(email);
  }
  if (users.length < 1000) break;
}

const { data: orders, error: ordersError } = await db.from("payment_orders").select("customer");
if (ordersError) throw ordersError;
for (const order of orders ?? []) {
  const customer = asRecord(order.customer);
  const email = normalize(customer.email);
  if (!validEmail(email)) continue;
  allPeople.add(email);
  purchasers.add(email);
  if (asRecord(customer.marketingConsent).acceptedAt) consented.add(email);
}

const consentedBuyers = [...purchasers].filter((email) => consented.has(email)).length;
const percentage = (part, whole) => whole ? Math.round((part / whole) * 1000) / 10 : 0;

console.info(JSON.stringify({
  uniquePeople: allPeople.size,
  consentedPeople: consented.size,
  consentAmongAllPeoplePercent: percentage(consented.size, allPeople.size),
  uniqueBuyers: purchasers.size,
  consentedBuyers,
  consentAmongBuyersPercent: percentage(consentedBuyers, purchasers.size),
}));
