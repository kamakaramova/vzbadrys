// Обновляет только редакционные поля существующей карточки набора в production.
// Запуск на VPS с уже загруженным окружением: node scripts/update-health-bundle-copy.mjs --apply
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/products.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { products } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

const id = "nabor-magniy-tsink-selen";
const updatedProduct = products.find((product) => product.id === id);
if (!updatedProduct) throw new Error("Карточка набора не найдена в исходном каталоге");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) throw new Error("Подключение к базе не настроено");

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: row, error: readError } = await db.from("products")
  .select("id,data,updated_at").eq("id", id).single();
if (readError || !row) throw new Error("Не удалось прочитать карточку набора");
if (row.data?.sku !== updatedProduct.sku) throw new Error("Артикул набора не совпадает");

const editorialFields = ["description", "compositionDetails", "benefits", "whoNeeds"];
const changedFields = editorialFields.filter((field) =>
  JSON.stringify(row.data[field]) !== JSON.stringify(updatedProduct[field]));
console.log(`bundle=${id} changed_fields=${changedFields.join(",") || "none"}`);
if (!process.argv.includes("--apply") || changedFields.length === 0) {
  console.log("Проверка завершена без записи. Для обновления передайте --apply.");
  process.exit(0);
}

const backupDirectory = "/opt/vzbadrys-backups";
await mkdir(backupDirectory, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
const backupPath = `${backupDirectory}/health-bundle-copy-before-${stamp}.json`;
await writeFile(backupPath, JSON.stringify({ capturedAt: new Date().toISOString(), row }, null, 2),
  { mode: 0o600, flag: "wx" });
console.log(`backup=${backupPath}`);

const nextData = { ...row.data };
for (const field of editorialFields) nextData[field] = updatedProduct[field];
const { data: saved, error: writeError } = await db.from("products")
  .update({ data: nextData, updated_at: new Date().toISOString() })
  .eq("id", id).eq("updated_at", row.updated_at)
  .select("id,data").maybeSingle();
if (writeError || !saved) throw new Error("Карточка изменилась с момента чтения либо запись не удалась");
if (editorialFields.some((field) => JSON.stringify(saved.data[field]) !== JSON.stringify(updatedProduct[field]))) {
  throw new Error("Обновлённый текст не прошёл проверку");
}
console.log(`updated=${saved.id} fields=${changedFields.join(",")}`);
