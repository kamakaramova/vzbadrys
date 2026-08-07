import "server-only";

import { getServerSupabase } from "@/lib/supabaseServer";

export const DELIVERY_METHOD_IDS = ["pickup", "sdek_pvz", "yandex_pvz", "ozon_pvz", "pochta"] as const;
export type DeliveryMethodId = (typeof DELIVERY_METHOD_IDS)[number];

export type DeliverySettings = {
  enabled: Record<DeliveryMethodId, boolean>;
  pochtaWidgetId: number;
};

export const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  enabled: {
    pickup: true,
    sdek_pvz: true,
    yandex_pvz: true,
    ozon_pvz: true,
    pochta: true,
  },
  pochtaWidgetId: 62722,
};

function normalize(data: Record<string, unknown> | null | undefined): DeliverySettings {
  const rawEnabled = data?.enabled && typeof data.enabled === "object"
    ? data.enabled as Record<string, unknown>
    : {};
  const enabled = Object.fromEntries(
    DELIVERY_METHOD_IDS.map((method) => [method, rawEnabled[method] !== false])
  ) as DeliverySettings["enabled"];
  const widgetId = Number(data?.pochta_widget_id);
  return {
    enabled,
    pochtaWidgetId: Number.isSafeInteger(widgetId) && widgetId > 0
      ? widgetId
      : DEFAULT_DELIVERY_SETTINGS.pochtaWidgetId,
  };
}

export async function getDeliverySettings(): Promise<DeliverySettings> {
  const db = getServerSupabase();
  if (!db) return DEFAULT_DELIVERY_SETTINGS;
  const { data, error } = await db
    .from("delivery_settings")
    .select("enabled,pochta_widget_id")
    .eq("id", "main")
    .maybeSingle();
  // Сайт продолжает работать с безопасными настройками по умолчанию, пока
  // таблица ещё не создана или не содержит единственную строку.
  if (error || !data) return DEFAULT_DELIVERY_SETTINGS;
  return normalize(data as Record<string, unknown>);
}

export function sanitizeDeliverySettings(input: unknown): DeliverySettings | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const rawEnabled = value.enabled;
  if (!rawEnabled || typeof rawEnabled !== "object") return null;
  const enabled = Object.fromEntries(
    DELIVERY_METHOD_IDS.map((method) => [method, (rawEnabled as Record<string, unknown>)[method] !== false])
  ) as DeliverySettings["enabled"];
  const pochtaWidgetId = Number(value.pochtaWidgetId);
  if (!Number.isSafeInteger(pochtaWidgetId) || pochtaWidgetId <= 0) return null;
  return { enabled, pochtaWidgetId };
}
