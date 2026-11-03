import assert from "node:assert/strict";
import test from "node:test";

import { summarizeReferralOrders } from "../src/lib/referralOrderSummary.ts";

test("referral statistics distinguish the code owner from each paying buyer", () => {
  const referrals = summarizeReferralOrders([
    {
      id: "order-1", amount_kopecks: 226050,
      customer: { name: "Мария", surname: "Тестовая", email: "buyer1@example.test" },
      referral_code: "TEST-CODE", referral_owner_id: "owner-1", referral_discount_percent: 5,
      paid_at: "2026-11-01T10:00:00Z", created_at: "2026-11-01T09:00:00Z",
    },
    {
      id: "order-2", amount_kopecks: 10000,
      customer: { name: "Алексей", email: "buyer2@example.test" },
      referral_code: "TEST-CODE", referral_owner_id: "owner-1", referral_discount_percent: 5,
      paid_at: "2026-11-02T10:00:00Z", created_at: "2026-11-02T09:00:00Z",
    },
    {
      id: "order-3", amount_kopecks: 5000, customer: null,
      referral_code: null, referral_owner_id: null, referral_discount_percent: null,
      paid_at: "2026-11-03T10:00:00Z", created_at: "2026-11-03T09:00:00Z",
    },
  ]);

  assert.equal(referrals.length, 1);
  assert.equal(referrals[0].ownerId, "owner-1");
  assert.equal(referrals[0].paidOrders, 2);
  assert.equal(referrals[0].revenue, 2360.5);
  assert.deepEqual(referrals[0].orders.map((order) => order.id), ["order-2", "order-1"]);
  assert.deepEqual(referrals[0].orders[1], {
    id: "order-1", buyerName: "Мария Тестовая", buyerEmail: "buyer1@example.test",
    amount: 2260.5, date: "2026-11-01T10:00:00Z", code: "TEST-CODE",
  });
});

test("missing buyer name stays explicit instead of being confused with the code owner", () => {
  const referrals = summarizeReferralOrders([{
    id: "order-4", amount_kopecks: 2000, customer: { email: "buyer@example.test" },
    referral_code: "TEST-CODE", referral_owner_id: "owner-1", referral_discount_percent: null,
    paid_at: null, created_at: "2026-11-03T09:00:00Z",
  }]);

  assert.equal(referrals[0].orders[0].buyerName, "Имя не указано");
  assert.equal(referrals[0].orders[0].buyerEmail, "buyer@example.test");
  assert.equal(referrals[0].orders[0].date, "2026-11-03T09:00:00Z");
});
