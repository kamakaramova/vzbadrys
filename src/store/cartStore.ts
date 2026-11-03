"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { promoDiscountAmount } from "@/lib/promoRules";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category: string;
  unit?: string;
}

interface CartStore {
  items: CartItem[];
  promoCode: string;
  promoDiscount: number;
  promoProductIds: string[] | null;
  referralCode: string;
  referralDiscount: number;
  referrerId: string | null;
  bonusPointsToSpend: number;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  setPromo: (code: string, discount: number, productIds: string[] | null) => void;
  setReferral: (code: string, discount: number, referrerId?: string | null) => void;
  setBonusPointsToSpend: (points: number) => void;
  removePromo: () => void;
  removeReferral: () => void;
  totalItems: () => number;
  subtotal: () => number;
  discount: () => number;
  total: () => number;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: "",
      promoDiscount: 0,
      promoProductIds: null,
      referralCode: "",
      referralDiscount: 0,
      referrerId: null,
      bonusPointsToSpend: 0,

      addItem: (item) => {
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { items: [...state.items, { ...item, quantity: 1 }] };
        });
      },

      removeItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),

      updateQty: (id, qty) => {
        if (qty < 1) { get().removeItem(id); return; }
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, quantity: qty } : i)),
        }));
      },

      clearCart: () => set({ items: [], promoCode: "", promoDiscount: 0, promoProductIds: null, referralCode: "", referralDiscount: 0, referrerId: null, bonusPointsToSpend: 0 }),

      setPromo: (code, discount, productIds) => set({ promoCode: code.trim().toUpperCase(), promoDiscount: discount, promoProductIds: productIds }),
      setReferral: (code, discount, referrerId = null) => set({ referralCode: code.trim().toUpperCase(), referralDiscount: discount, referrerId }),
      setBonusPointsToSpend: (points) => set({ bonusPointsToSpend: Math.max(0, Math.floor(points)) }),
      removePromo: () => set({ promoCode: "", promoDiscount: 0, promoProductIds: null }),
      removeReferral: () => set({ referralCode: "", referralDiscount: 0, referrerId: null }),

      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
      // Округляем каждую скидку отдельно, чтобы итог совпадал с её отображением.
      discount: () => {
        const subtotal = get().subtotal();
        return promoDiscountAmount(get().items, get().promoDiscount, get().promoProductIds)
          + Math.round((subtotal * get().referralDiscount) / 100);
      },
      total: () => get().subtotal() - get().discount(),
    }),
    {
      name: "vzbadrys-cart",
      version: 2,
      migrate: (persistedState) => {
        const state = persistedState as CartStore;
        return {
          ...state,
          promoProductIds: Array.isArray(state.promoProductIds) ? state.promoProductIds : null,
        };
      },
    }
  )
);
