"use client";
import { useEffect } from "react";
import { create } from "zustand";
import { Product, products as defaultProducts } from "@/lib/products";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

interface ProductStore {
  products: Product[];
  initialized: boolean;
  loading: boolean;
  adminPassword: string | null;
  setAdminPassword: (pw: string | null) => void;
  init: () => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  toggleStock: (id: string) => void;
  resetToDefault: () => void;
  seedDatabase: () => Promise<{ ok: boolean; error?: string }>;
  getProducts: () => Product[];
  receiveStock: (id: string, qty: number) => void;
  writeOffStock: (id: string, qty: number) => void;
  setStockQty: (id: string, qty: number) => void;
}

// Отправка изменённого товара в базу (только из админки, где задан пароль).
async function persist(product: Product, password: string | null) {
  if (!password || !isSupabaseConfigured) return;
  try {
    await fetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, op: "upsert", product }),
    });
  } catch {
    /* тихо игнорируем — локальное состояние уже обновлено */
  }
}

export const useProductStore = create<ProductStore>((set, get) => ({
  // Статичный каталог служит мгновенным резервным источником. Благодаря этому
  // товары и ссылки видны даже до загрузки Supabase и клиентского JavaScript.
  products: defaultProducts,
  initialized: false,
  loading: false,
  adminPassword: null,

  setAdminPassword: (pw) => set({ adminPassword: pw }),

  init: async () => {
    if (get().initialized || get().loading) return;
    set({ loading: true });

    // Пытаемся загрузить из базы. Если не настроено или пусто — статичные данные.
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.from("products").select("data");
      if (!error && data && data.length > 0) {
        set({
          products: data.map((r) => {
            const savedProduct = r.data as Product;
            const catalogueProduct = defaultProducts.find((product) => product.id === savedProduct.id);

            // Старые записи в Supabase были созданы до появления артикулов.
            // Берём новый артикул из каталога, не затирая остальные изменения администратора.
            return { ...savedProduct, sku: savedProduct.sku || catalogueProduct?.sku };
          }),
          initialized: true,
          loading: false,
        });
        return;
      }
    }
    set({ products: defaultProducts, initialized: true, loading: false });
  },

  updateProduct: (id, updates) => {
    let changed: Product | undefined;
    set((s) => ({
      products: s.products.map((p) => {
        if (p.id !== id) return p;
        changed = { ...p, ...updates };
        return changed;
      }),
    }));
    if (changed) persist(changed, get().adminPassword);
  },

  addProduct: (product) => {
    set((s) => ({ products: [...s.products, product] }));
    persist(product, get().adminPassword);
  },

  deleteProduct: (id) => {
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
    const pw = get().adminPassword;
    if (pw && isSupabaseConfigured) {
      fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw, op: "delete", id }),
      }).catch(() => {});
    }
  },

  toggleStock: (id) => {
    let changed: Product | undefined;
    set((s) => ({
      products: s.products.map((p) => {
        if (p.id !== id) return p;
        changed = { ...p, inStock: !p.inStock };
        return changed;
      }),
    }));
    if (changed) persist(changed, get().adminPassword);
  },

  resetToDefault: () => {
    set({ products: defaultProducts });
    const pw = get().adminPassword;
    defaultProducts.forEach((p) => persist(p, pw));
  },

  // Первичная заливка товаров в базу (одна кнопка в админке)
  seedDatabase: async () => {
    const pw = get().adminPassword;
    if (!pw) return { ok: false, error: "Нет доступа" };
    if (!isSupabaseConfigured) return { ok: false, error: "База не подключена" };
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw, op: "seed", products: get().products.length ? get().products : defaultProducts }),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error || "Ошибка" };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  getProducts: () => get().products,

  receiveStock: (id, qty) => {
    let changed: Product | undefined;
    set((s) => ({
      products: s.products.map((p) => {
        if (p.id !== id) return p;
        const newQty = (p.stockQty ?? 0) + qty;
        changed = { ...p, stockQty: newQty, inStock: newQty > 0 };
        return changed;
      }),
    }));
    if (changed) persist(changed, get().adminPassword);
  },

  writeOffStock: (id, qty) => {
    let changed: Product | undefined;
    set((s) => ({
      products: s.products.map((p) => {
        if (p.id !== id) return p;
        const newQty = Math.max(0, (p.stockQty ?? 0) - qty);
        changed = { ...p, stockQty: newQty, inStock: newQty > 0 };
        return changed;
      }),
    }));
    if (changed) persist(changed, get().adminPassword);
  },

  setStockQty: (id, qty) => {
    let changed: Product | undefined;
    set((s) => ({
      products: s.products.map((p) => {
        if (p.id !== id) return p;
        const newQty = Math.max(0, qty);
        changed = { ...p, stockQty: newQty, inStock: newQty > 0 };
        return changed;
      }),
    }));
    if (changed) persist(changed, get().adminPassword);
  },
}));

// Удобный хук: сам инициализирует данные и отдаёт актуальный список товаров.
// Сразу отдаёт статичные товары, а после инициализации заменяет их данными из БД.
export function useProducts(): { products: Product[]; ready: boolean } {
  const products = useProductStore((s) => s.products);
  const initialized = useProductStore((s) => s.initialized);
  const init = useProductStore((s) => s.init);
  useEffect(() => {
    if (!initialized) init();
  }, [initialized, init]);

  return { products, ready: products.length > 0 };
}
