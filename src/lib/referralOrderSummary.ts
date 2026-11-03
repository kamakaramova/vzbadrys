export type ReferralOrderRow = {
  id: string;
  amount_kopecks: number | null;
  customer: Record<string, unknown> | null;
  referral_code: string | null;
  referral_owner_id: string | null;
  referral_discount_percent: number | null;
  paid_at: string | null;
  created_at: string | null;
};

export type ReferralOrderDetail = {
  id: string;
  buyerName: string;
  buyerEmail: string;
  amount: number;
  date: string;
  code: string;
};

export type ReferralSummary = {
  ownerId: string;
  code: string;
  discountPercent: number;
  paidOrders: number;
  revenue: number;
  orders: ReferralOrderDetail[];
};

export function summarizeReferralOrders(rows: ReferralOrderRow[]): ReferralSummary[] {
  const byOwner = new Map<string, ReferralSummary>();

  for (const row of rows) {
    if (!row.referral_owner_id || !row.referral_code) continue;

    const customer = row.customer ?? {};
    const buyerName = [customer.name, customer.surname]
      .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
      .map((part) => part.trim())
      .join(" ") || "Имя не указано";
    const buyerEmail = typeof customer.email === "string" ? customer.email.trim() : "";
    const amount = Number(row.amount_kopecks ?? 0) / 100;
    const summary = byOwner.get(row.referral_owner_id) ?? {
      ownerId: row.referral_owner_id,
      code: row.referral_code,
      discountPercent: Number(row.referral_discount_percent ?? 5),
      paidOrders: 0,
      revenue: 0,
      orders: [],
    };

    summary.paidOrders += 1;
    summary.revenue += amount;
    summary.orders.push({
      id: row.id,
      buyerName,
      buyerEmail,
      amount,
      date: row.paid_at || row.created_at || "",
      code: row.referral_code,
    });
    byOwner.set(row.referral_owner_id, summary);
  }

  return [...byOwner.values()].map((summary) => ({
    ...summary,
    orders: summary.orders.sort((a, b) => b.date.localeCompare(a.date)),
  }));
}
