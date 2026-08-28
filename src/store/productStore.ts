"use client";
import { useEffect } from "react";
import { create } from "zustand";
import { Product, products as defaultProducts } from "@/lib/products";

type SaveResult = { ok: boolean; error?: string };
const PRODUCT_CACHE_KEY = "vzbadrys:last-known-products";

function mergeWithCatalogue(savedProducts: Product[]): Product[] {
  const savedById = new Map<string, Product>(
    savedProducts.map((product): [string, Product] => [product.id, product]),
  );
  const mergedProducts = defaultProducts.map((catalogueProduct) => {
    const savedProduct = savedById.get(catalogueProduct.id);
    return savedProduct
      ? {
          ...catalogueProduct,
          ...savedProduct,
          sku: savedProduct.sku || catalogueProduct.sku,
          // Документы хранятся как проверенные PDF в репозитории. Старые записи
          // Supabase могут содержать прежние ссылки и не должны их перезаписывать.
          documents: catalogueProduct.documents,
        }
      : catalogueProduct;
  });
  const customProducts = savedProducts.filter(
    (product) => !defaultProducts.some((catalogueProduct) => catalogueProduct.id === product.id),
  );
  return [...mergedProducts, ...customProducts];
}

function readCachedProducts(): Product[] | null {
  if (typeof window === "undefined") return null;
  try {
    const cached = JSON.parse(window.localStorage.getItem(PRODUCT_CACHE_KEY) ?? "null");
    return Array.isArray(cached) ? cached : null;
  } catch {
    return null;
  }
}

function cacheProducts(products: Product[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(products));
  } catch {
    // Кэш удобен, но не должен мешать покупке, если браузер запретил localStorage.
  }
}

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
}

// Отправка изменённого товара в базу (только из админки, где задан пароль).
async function persist(product: Product, password: string | null): Promise<SaveResult> {
  if (!password) return { ok: false, error: "Сессия администратора закончилась. Войдите заново." };
  try {
    const response = await fetch("/api/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "upsert", product }),
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

    const cachedProducts = readCachedProducts();
    if (cachedProducts?.length) set({ products: mergeWithCatalogue(cachedProducts) });

    // Читаем через серверный маршрут, а не напрямую из браузера. Так правила RLS
    // не могут вернуть старый каталог или пустой результат после правки в админке.
    try {
      const response = await fetch("/api/products", { cache: "no-store" });
      const payload = await response.json();
      if (response.ok && Array.isArray(payload.products)) {
        const products = mergeWithCatalogue(payload.products as Product[]);
        cacheProducts(payload.products as Product[]);
        set({ products, initialized: true, loading: false });
        return;
      }
    } catch {
      // На случай временной недоступности базы оставляем последнюю корректную
      // версию, а не подменяем её устаревшими значениями из исходного каталога.
    }
    set({ initialized: true, loading: false });
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
        body: JSON.stringify({ op: "delete", id }),
      });
      const data = await response.json().catch(() => ({}));
      return response.ok ? { ok: true } : { ok: false, error: data.error || "Не удалось удалить товар" };
    } catch {
      return { ok: false, error: "Не удалось связаться с базой. Повторите попытку." };
    }
  },

  toggleStock: async (id) => {
    const existing = get().products.find((product) => product.id === id);
    if (!existing) return { ok: false, error: "Товар не найден" };
    const password = get().adminPassword;
    if (!password) return { ok: false, error: "Сессия администратора закончилась. Войдите заново." };
    try {
      const response = await fetch("/api/products", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "toggleStock", id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return { ok: false, error: payload.error || "Не удалось изменить наличие" };
      set((state) => ({ products: state.products.map((product) => product.id === id ? { ...product, inStock: Boolean(payload.inStock) } : product) }));
      return { ok: true };
    } catch {
      return { ok: false, error: "Не удалось связаться с базой. Повторите попытку." };
    }
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
        body: JSON.stringify({ op: "seed", products: get().products.length ? get().products : defaultProducts }),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, error: json.error || "Ошибка" };
      return { ok: true };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  getProducts: () => get().products,
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
