import { createClient, SupabaseClient } from "@supabase/supabase-js";

const TRANSIENT_NETWORK_ERROR = /(?:etimedout|econnreset|eai_again|socket hang up|fetch failed|terminated)/i;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Supabase находится во внешнем облаке: редкий обрыв соединения не должен сразу
// превращаться в ошибку витрины. Повторяем только безопасные запросы на чтение —
// записи никогда не дублируем автоматически.
async function resilientSupabaseFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const method = (init?.method ?? "GET").toUpperCase();
  const canRetry = method === "GET" || method === "HEAD";
  const attempts = canRetry ? 3 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch(input, { ...init, signal: controller.signal });
      if (canRetry && attempt < attempts - 1 && (response.status === 429 || response.status >= 500)) {
        await wait(250 * (attempt + 1));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      const details = `${error} ${(error as { cause?: unknown })?.cause ?? ""}`;
      if (!canRetry || attempt === attempts - 1 || !TRANSIENT_NETWORK_ERROR.test(details)) throw error;
      await wait(250 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Не удалось выполнить запрос к базе данных");
}

// Серверный клиент — использует СЕКРЕТНЫЙ ключ (обходит защиту записи).
// Живёт только на сервере (в API-роутах), в браузер никогда не попадает.
export function getServerSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: resilientSupabaseFetch },
  });
}
