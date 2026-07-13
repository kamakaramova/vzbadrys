import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Серверный клиент — использует СЕКРЕТНЫЙ ключ (обходит защиту записи).
// Живёт только на сервере (в API-роутах), в браузер никогда не попадает.
export function getServerSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
