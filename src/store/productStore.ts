"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Product, products as defaultProducts } from "@/lib/products";

interface ProductStore {
  products: Product[];
  initialized: boolean;
  init: () => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  addProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  toggleStock: (id: string) => void;
  resetToDefault: () => void;
  getProducts: () => Product[];
  // управление остатками
  receiveStock: (id: string, qty: number) => void;   // приёмка: добавить к остатку
  writeOffStock: (id: string, qty: number) => void;  // списание: уменьшить остаток
  setStockQty: (id: string, qty: number) => void;    // установить точное кол-во
}

export const useProductStore = create<ProductStore>()(
  persist(
    (set, get) => ({
      products: [],
      initialized: false,

      init: () => {
        if (!get().initialized) {
          set({ products: defaultProducts, initialized: true });
        }
      },

      updateProduct: (id, updates) =>
        set((s) => ({
          products: s.products.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        })),

      addProduct: (product) =>
        set((s) => ({ products: [...s.products, product] })),

      deleteProduct: (id) =>
        set((s) => ({ products: s.products.filter((p) => p.id !== id) })),

      toggleStock: (id) =>
        set((s) => ({
          products: s.products.map((p) =>
            p.id === id ? { ...p, inStock: !p.inStock } : p
          ),
        })),

      resetToDefault: () =>
        set({ products: defaultProducts, initialized: true }),

      getProducts: () => get().products,

      receiveStock: (id, qty) =>
        set((s) => ({
          products: s.products.map((p) => {
            if (p.id !== id) return p;
            const newQty = (p.stockQty ?? 0) + qty;
            return { ...p, stockQty: newQty, inStock: newQty > 0 };
          }),
        })),

      writeOffStock: (id, qty) =>
        set((s) => ({
          products: s.products.map((p) => {
            if (p.id !== id) return p;
            const newQty = Math.max(0, (p.stockQty ?? 0) - qty);
            return { ...p, stockQty: newQty, inStock: newQty > 0 };
          }),
        })),

      setStockQty: (id, qty) =>
        set((s) => ({
          products: s.products.map((p) => {
            if (p.id !== id) return p;
            const newQty = Math.max(0, qty);
            return { ...p, stockQty: newQty, inStock: newQty > 0 };
          }),
        })),
    }),
    { name: "vzbadrys-products" }
  )
);
