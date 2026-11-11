import assert from "node:assert/strict";
import test from "node:test";

import { normalizeOzonPaymentProviderStatus } from "../src/lib/ozonPaymentProtocol.ts";

test("normalizes the enum-style statuses returned by Ozon status API", () => {
  assert.equal(normalizeOzonPaymentProviderStatus("STATUS_PAID"), "paid");
  assert.equal(normalizeOzonPaymentProviderStatus("STATUS_AUTHORIZED"), "authorized");
  assert.equal(normalizeOzonPaymentProviderStatus("STATUS_REJECTED"), "rejected");
  assert.equal(normalizeOzonPaymentProviderStatus("STATUS_EXPIRED"), "expired");
  assert.equal(normalizeOzonPaymentProviderStatus("STATUS_REFUNDED"), "refunded");
});

test("keeps legacy webhook statuses compatible", () => {
  assert.equal(normalizeOzonPaymentProviderStatus(" Completed "), "completed");
  assert.equal(normalizeOzonPaymentProviderStatus("Failed"), "failed");
});
