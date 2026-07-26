import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export interface StockDecrement {
  id: string;
  amount: number;
}

export async function decrementProductStock(db: SupabaseClient, items: StockDecrement[]) {
  const normalized = items.filter(
    (item) => typeof item.id === "string" && Number.isFinite(item.amount) && item.amount > 0
  );
  if (normalized.length === 0) return;

  const ids = [...new Set(normalized.map((item) => item.id))];
  const { data, error } = await db.from("products").select("id, data").in("id", ids);
  if (error) throw new Error(error.message);

  const updatedAt = new Date().toISOString();
  const updates = (data ?? []).flatMap((row) => {
    const product = row.data as { stockQty?: number; inStock?: boolean };
    if (typeof product.stockQty !== "number") return [];
    const amount = normalized
      .filter((item) => item.id === row.id)
      .reduce((sum, item) => sum + item.amount, 0);
    const stockQty = Math.max(0, product.stockQty - amount);
    return [{
      id: row.id,
      data: { ...product, stockQty, inStock: stockQty > 0 },
      updated_at: updatedAt,
    }];
  });

  if (updates.length > 0) {
    const { error: updateError } = await db.from("products").upsert(updates);
    if (updateError) throw new Error(updateError.message);
  }
}
