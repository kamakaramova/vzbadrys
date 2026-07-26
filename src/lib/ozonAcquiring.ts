import "server-only";

import { createHash, timingSafeEqual } from "crypto";

export const OZON_API_URL = "https://payapi.ozon.ru";
export const CURRENCY_CODE = "643";

const ALLOWED_VAT = new Set([
  "VAT_0",
  "VAT_5",
  "VAT_7",
  "VAT_10",
  "VAT_22",
  "VAT_10_110",
  "VAT_22_122",
  "VAT_NONE",
  "VAT_18",
  "VAT_18_118",
  "VAT_5_105",
  "VAT_7_107",
]);

export function getOzonConfig() {
  const accessKey = process.env.OZON_ACQUIRING_ACCESS_KEY;
  const secretKey = process.env.OZON_ACQUIRING_SECRET_KEY;
  const notificationSecret = process.env.OZON_ACQUIRING_NOTIFICATION_SECRET;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://xn--80abckmj9cj3h.xn--p1ai").replace(/\/$/, "");
  const vatCandidate = process.env.OZON_ACQUIRING_VAT || "VAT_NONE";
  const fiscalizationCandidate = process.env.OZON_ACQUIRING_FISCALIZATION_TYPE || "FISCAL_TYPE_DOUBLE";

  if (!accessKey || !secretKey) {
    throw new Error("Ozon Acquiring не настроен: отсутствует ключ интеграции");
  }
  if (!ALLOWED_VAT.has(vatCandidate)) {
    throw new Error("Некорректная ставка НДС для Ozon Acquiring");
  }
  if (!["FISCAL_TYPE_SINGLE", "FISCAL_TYPE_DOUBLE"].includes(fiscalizationCandidate)) {
    throw new Error("Некорректный тип фискализации Ozon Acquiring");
  }

  return {
    accessKey,
    secretKey,
    notificationSecret,
    siteUrl,
    vat: vatCandidate,
    fiscalizationType: fiscalizationCandidate,
  };
}

export function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export function createOrderSignature(params: {
  accessKey: string;
  expiresAt: string;
  extId: string;
  fiscalizationType: string;
  paymentAlgorithm: string;
  amountValue: string;
  secretKey: string;
}) {
  return sha256(
    params.accessKey +
      params.expiresAt +
      params.extId +
      params.fiscalizationType +
      params.paymentAlgorithm +
      CURRENCY_CODE +
      params.amountValue +
      params.secretKey
  );
}

export function verifyNotificationSignature(params: {
  received: string;
  accessKey: string;
  orderId: string;
  transactionId: string;
  extOrderId: string;
  amount: number;
  currencyCode: string;
  notificationSecret: string;
}) {
  const expected = sha256(
    `${params.accessKey}|${params.orderId}|${params.transactionId}|${params.extOrderId}|${params.amount}|${params.currencyCode}|${params.notificationSecret}`
  );
  const received = params.received.toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(received)) return false;
  return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(received, "hex"));
}

export async function postToOzon<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${OZON_API_URL}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as T | null;
    if (!response.ok || !data) {
      throw new Error(`Ozon Acquiring вернул ошибку ${response.status}`);
    }
    return data;
  } finally {
    clearTimeout(timeout);
  }
}
