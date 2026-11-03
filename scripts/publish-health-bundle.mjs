// Однократная публикация виртуального набора после выпуска серверной логики.
// Запуск на VPS с уже загруженным production-окружением:
// node --experimental-strip-types scripts/publish-health-bundle.mjs --apply
import { mkdir, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { products } from "../src/lib/products.ts";

const bundleId = "nabor-magniy-tsink-selen";
const componentIds = ["magniy-citrat-b6", "magniy-bisglitinat", "selen-tsink"];
const apply = process.argv.includes("--apply");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Production database connection is not configured");

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: rows, error: readError } = await db.from("products").select("id,data").in("id", [bundleId, ...componentIds]);
if (readError) throw new Error(`Could not inspect product rows: ${readError.message}`);
const byId = new Map((rows ?? []).map((row) => [row.id, row]));
const components = componentIds.map((id) => byId.get(id)?.data);
if (components.some((component) => !component || component.category !== "bads"
  || !Number.isInteger(component.stockQty) || component.stockQty <= 0 || !component.inStock)) {
  throw new Error("One of the three physical products has no confirmed available stock");
}
const currentBundle = byId.get(bundleId)?.data;
if (currentBundle && (currentBundle.sku !== "VZB-KIT-MG-ZNSE" || currentBundle.price !== 1990)) {
  throw new Error("A different product already uses the bundle ID; no write was made");
}
if (currentBundle?.bundleEnabled === true) {
  console.log(`already_published=${bundleId} price=${currentBundle.price}`);
  process.exit(0);
}
const stockQty = Math.min(...components.map((component) => component.stockQty));
const bundle = products.find((product) => product.id === bundleId);
if (!bundle) throw new Error("The bundle card is missing from the source catalogue");

console.log(`bundle=${bundleId} price=${bundle.price} component_stock=${components.map((item) => item.stockQty).join(",")} available_sets=${stockQty}`);
if (!apply) {
  console.log("Dry run only. Pass --apply after the application deploy has succeeded.");
  process.exit(0);
}

const backupDirectory = "/opt/vzbadrys-backups";
await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
const backupPath = `${backupDirectory}/health-bundle-before-${stamp}.json`;
await writeFile(backupPath, JSON.stringify({ capturedAt: new Date().toISOString(), rows }, null, 2), { mode: 0o600, flag: "wx" });
console.log(`backup=${backupPath}`);

const { error: writeError } = await db.from("products").upsert({
  id: bundleId,
  data: { ...bundle, bundleEnabled: true, inStock: true, stockQty },
  updated_at: new Date().toISOString(),
});
if (writeError) throw new Error(`Bundle was not published: ${writeError.message}`);
const { data: saved, error: verifyError } = await db.from("products").select("id,data").eq("id", bundleId).maybeSingle();
if (verifyError || saved?.data?.bundleEnabled !== true || saved.data.price !== 1990) {
  throw new Error("Bundle write did not pass verification");
}
console.log(`published=${saved.id} price=${saved.data.price} available_sets=${stockQty} documents=${saved.data.documents?.length ?? 0}`);
