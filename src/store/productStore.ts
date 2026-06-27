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
    }),
    { name: "vzbadrys-products" }
  )
);
