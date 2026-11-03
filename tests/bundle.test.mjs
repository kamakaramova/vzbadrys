import assert from "node:assert/strict";
import test from "node:test";

import { buildBundleOrderLines, bundleComponentPrices, HEALTH_BUNDLE_ID, withBundleAvailability } from "../src/lib/bundle.ts";

test("fixed bundle price is allocated exactly across three physical products", () => {
  const prices = bundleComponentPrices(1990, [868, 901, 715]);
  assert.equal(prices.length, 3);
  assert.equal(prices.reduce((sum, value) => sum + value, 0), 1990);
  assert.ok(prices.every((value) => Number.isInteger(value) && value > 0));
  assert.equal(prices.reduce((sum, value) => sum + value * 2, 0), 3980);
});

test("one or two bundles appear as one cart item but allocate all physical bottles", () => {
  const bundle = { id: HEALTH_BUNDLE_ID, name: "Набор", price: 1990, category: "bads" };
  const parts = [
    { id: "magniy-citrat-b6", name: "Цитрат", price: 868, category: "bads" },
    { id: "magniy-bisglitinat", name: "Хелат", price: 901, category: "bads" },
    { id: "selen-tsink", name: "Цинк + Селен", price: 715, category: "bads" },
  ];
  for (const quantity of [1, 2]) {
    const lines = buildBundleOrderLines(bundle, parts, quantity, (product) => product.name);
    assert.equal(lines.length, 4);
    assert.equal(lines.filter((line) => line.hiddenInOrder !== true).length, 1);
    assert.equal(lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0), 1990 * quantity);
    assert.deepEqual(lines.slice(1).map((line) => line.stockAmount), [quantity, quantity, quantity]);
    assert.ok(lines.slice(1).every((line) => line.needMark));
  }
});

test("bundle stock follows the scarcest bottle and hides when one is unavailable", () => {
  const catalogue = [
    { id: HEALTH_BUNDLE_ID, bundleEnabled: true, inStock: true },
    { id: "magniy-citrat-b6", stockQty: 8, inStock: true },
    { id: "magniy-bisglitinat", stockQty: 2, inStock: true },
    { id: "selen-tsink", stockQty: 5, inStock: true },
  ];
  const available = withBundleAvailability(catalogue).find((item) => item.id === HEALTH_BUNDLE_ID);
  assert.equal(available.stockQty, 2);
  assert.equal(available.inStock, true);

  const soldOut = catalogue.map((item) => item.id === "selen-tsink" ? { ...item, stockQty: 0, inStock: false } : item);
  const unavailable = withBundleAvailability(soldOut).find((item) => item.id === HEALTH_BUNDLE_ID);
  assert.equal(unavailable.stockQty, 0);
  assert.equal(unavailable.inStock, false);

  const unknownStock = catalogue.map((item) => item.id === "magniy-bisglitinat" ? { ...item, stockQty: undefined } : item);
  assert.equal(withBundleAvailability(unknownStock).find((item) => item.id === HEALTH_BUNDLE_ID).inStock, false);
});
