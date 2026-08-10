"use client";
import { useEffect } from "react";
import { create } from "zustand";
import { Product, products as defaultProducts } from "@/lib/products";

type SaveResult = { ok: boolean; error?: string };

interface ProductStore {
  products: Product[];
  initialized: boolean;
  loading: boolean;
  adminPassword: string | null;
  setAdminPassword: (pw: string | null) => void;
  init: () => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<SaveResult>;
  addProduct: (product: Product) => Promise<SaveResult>;
  deleteProduct: (id: string) => Promise<SaveResult>;
  toggleStock: (id: string) => Promise<SaveResult>;
  resetToDefault: () => Promise<SaveResult>;
  seedDatabase: () => Promise<{ ok: boolean; error?: string }>;
  getProducts: () => Product[];
  receiveStock: (id: string, qty: number) => Promise<SaveResult>;
  writeOffStock: (id: string, qty: number) => Promise<SaveResult>;
  setStockQty: (id: string, qty: number) => Promise<SaveResult>;
}

// Отправка изменённого товара в базу (только из админки, где задан пароль).
async function persist(product: Product, password: string | null): Promise<SaveResult> {
  if (!password) return { ok: false, error: "Сессия администратора закончилась. Войдите заново." };
  try {
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password, op: "upsert", product }),
    });
    const data = await response.json().catch(() => ({}));
    return response.ok ? { ok: true } : { ok: false, error: data.error || "Не удалось сохранить изменения" };
  } catch {
    return { ok: false, error: "Не удалось связаться с базой. Проверьте соединение и повторите." };
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

    // Читаем через серверный маршрут, а не напрямую из браузера. Так правила RLS
    // не могут вернуть старый каталог или пустой результат после правки в админке.
    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      const payload = await response.json();
      if (response.ok && Array.isArray(payload.products)) {
        const savedById = new Map<string, Product>(
          payload.products.map((product: Product): [string, Product] => [product.id, product]),
        );
        const mergedProducts = defaultProducts.map((catalogueProduct) => {
          const savedProduct = savedById.get(catalogueProduct.id);
          return savedProduct
            ? { ...catalogueProduct, ...savedProduct, sku: savedProduct.sku || catalogueProduct.sku }
            : catalogueProduct;
        });
        const customProducts = payload.products.filter(
          (product: Product) => !defaultProducts.some((catalogueProduct) => catalogueProduct.id === product.id),
        );
        set({ products: [...mergedProducts, ...customProducts], initialized: true, loading: false });
        return;
      }
    } catch {
      // На случай временной недоступности базы сохраняем доступность витрины.
    }
    set({ products: defaultProducts, initialized: true, loading: false });
  },

  updateProduct: async (id, updates) => {
    let changed: Product | undefined;
    set((s) => ({
      products: s.products.map((p) => {
        if (p.id !== id) return p;
        changed = { ...p, ...updates };
        return changed;
      }),
    }));
    return changed ? persist(changed, get().adminPassword) : { ok: false, error: "Товар не найден" };
  },

  addProduct: async (product) => {
    set((s) => ({ products: [...s.products, product] }));
    return persist(product, get().adminPassword);
  },

  deleteProduct: async (id) => {
    set((s) => ({ products: s.products.filter((p) => p.id !== id) }));
    const pw = get().adminPassword;
    if (!pw) return { ok: false, error: "Сессия администратора закончилась. Войдите заново." };
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw, op: "delete", id }),
      });
      const data = await response.json().catch(() => ({}));
      return response.ok ? { ok: true } : { ok: false, error: data.error || "Не удалось удалить товар" };
    } catch {
      return { ok: false, error: "Не удалось связаться с базой. Повторите попытку." };
    }
  },

  toggleStock: async (id) => {
    let changed: Product | undefined;
    set((s) => ({
      products: s.products.map((p) => {
        if (p.id !== id) return p;
        changed = { ...p, inStock: !p.inStock };
        return changed;
      }),
    }));
    return changed ? persist(changed, get().adminPassword) : { ok: false, error: "Товар не найден" };
  },

  resetToDefault: async () => {
    set({ products: defaultProducts });
    const pw = get().adminPassword;
    const results = await Promise.all(defaultProducts.map((product) => persist(product, pw)));
    const failed = results.find((result) => !result.ok);
    return failed || { ok: true };
  },

  // Первичная заливка товаров в базу (одна кнопка в админке)
  seedDatabase: async () => {
    const pw = get().adminPassword;
    if (!pw) return { ok: false, error: "Нет доступа" };
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

  receiveStock: async (id, qty) => {
    let changed: Product | undefined;
    set((s) => ({
      products: s.products.map((p) => {
        if (p.id !== id) return p;
        const newQty = (p.stockQty ?? 0) + qty;
        changed = { ...p, stockQty: newQty, inStock: newQty > 0 };
        return changed;
      }),
    }));
    return changed ? persist(changed, get().adminPassword) : { ok: false, error: "Товар не найден" };
  },

  writeOffStock: async (id, qty) => {
    let changed: Product | undefined;
    set((s) => ({
      products: s.products.map((p) => {
        if (p.id !== id) return p;
        const newQty = Math.max(0, (p.stockQty ?? 0) - qty);
        changed = { ...p, stockQty: newQty, inStock: newQty > 0 };
        return changed;
      }),
    }));
    return changed ? persist(changed, get().adminPassword) : { ok: false, error: "Товар не найден" };
  },

  setStockQty: async (id, qty) => {
    let changed: Product | undefined;
    set((s) => ({
      products: s.products.map((p) => {
        if (p.id !== id) return p;
        const newQty = Math.max(0, qty);
        changed = { ...p, stockQty: newQty, inStock: newQty > 0 };
        return changed;
      }),
    }));
    return changed ? persist(changed, get().adminPassword) : { ok: false, error: "Товар не найден" };
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
