import assert from "node:assert/strict";
import test from "node:test";

import { getBlackFridayCardPrice } from "../src/lib/blackFridayPricing.ts";
import { buildBundleOrderLines, HEALTH_BUNDLE_ID } from "../src/lib/bundle.ts";

test("Black Friday prices are enabled for every promoted product", () => {
  assert.equal(getBlackFridayCardPrice("magniy-bisglitinat", 901)?.salePrice, 721);
  assert.equal(getBlackFridayCardPrice("magniy-citrat-b6", 868)?.salePrice, 694);
  assert.equal(getBlackFridayCardPrice("selen-tsink", 715)?.salePrice, 572);
  assert.equal(getBlackFridayCardPrice(HEALTH_BUNDLE_ID, 1987)?.salePrice, 1499);
  assert.equal(getBlackFridayCardPrice("unknown-product", 1000), null);
});

test("bundle fiscal lines add up to the Black Friday price", () => {
  const salePrice = getBlackFridayCardPrice(HEALTH_BUNDLE_ID, 1987)?.salePrice;
  assert.equal(salePrice, 1499);

  const bundle = {
    id: HEALTH_BUNDLE_ID,
    name: "Набор",
    price: salePrice,
    category: "bads",
  };
  const parts = [
    { id: "magniy-citrat-b6", name: "Цитрат", price: 868, category: "bads" },
    { id: "magniy-bisglitinat", name: "Бисглицинат", price: 901, category: "bads" },
    { id: "selen-tsink", name: "Цинк и селен", price: 715, category: "bads" },
  ];
  const lines = buildBundleOrderLines(bundle, parts, 1, (product) => product.name);
  const fiscalTotal = lines
    .filter((line) => !line.bundleDisplayOnly)
    .reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);

  assert.equal(fiscalTotal, 1499);
  assert.equal(lines[0].displayUnitPrice, 1499);
});
