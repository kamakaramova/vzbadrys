import assert from "node:assert/strict";
import test from "node:test";

import { parsePromoProductIds, promoDiscountAmount, promoEligibleSubtotal } from "../src/lib/promoRules.ts";

const cart = [
  { id: "magniy-citrat-b6", price: 800, quantity: 2 },
  { id: "selen-tsink", price: 700, quantity: 1 },
  { id: "nabor-magniy-tsink-selen", price: 1990, quantity: 1 },
];

test("all-products promo retains the existing whole-cart calculation", () => {
  assert.equal(promoEligibleSubtotal(cart, null), 4290);
  assert.equal(promoDiscountAmount(cart, 10, null), 429);
});

test("selected-products promo ignores other products and treats a bundle as its own product", () => {
  assert.equal(promoEligibleSubtotal(cart, ["magniy-citrat-b6"]), 1600);
  assert.equal(promoDiscountAmount(cart, 20, ["magniy-citrat-b6"]), 320);
  assert.equal(promoEligibleSubtotal(cart, ["selen-tsink"]), 700);
  assert.equal(promoEligibleSubtotal(cart, ["nabor-magniy-tsink-selen"]), 1990);
  assert.equal(promoEligibleSubtotal(cart, ["other-product"]), 0);
});

test("scope parser rejects empty, duplicate and malformed selections", () => {
  assert.equal(parsePromoProductIds(null), null);
  assert.deepEqual(parsePromoProductIds(["selen-tsink"]), ["selen-tsink"]);
  assert.equal(parsePromoProductIds([]), undefined);
  assert.equal(parsePromoProductIds(["selen-tsink", "selen-tsink"]), undefined);
  assert.equal(parsePromoProductIds(["../etc/passwd"]), undefined);
});
