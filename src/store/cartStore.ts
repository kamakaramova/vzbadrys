"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category: string;
  unit?: string;
}

export type PromoType = "promo" | "referral";

interface CartStore {
  items: CartItem[];
  promoCode: string;
  promoDiscount: number;
  promoType: PromoType | null;
  // id пользователя, чей реферальный код применён (чтобы начислить ему бонусы)
  referrerId: string | null;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  applyPromo: (
    code: string,
    users?: { id: string; referralCode: string }[],
    dynamicPromos?: { code: string; discount: number }[]
  ) => { ok: boolean; type?: PromoType; error?: string };
  removePromo: () => void;
  totalItems: () => number;
  subtotal: () => number;
  discount: () => number;
  total: () => number;
}

// Статические промокоды как запасной вариант (основные хранятся в promoStore)
const FALLBACK_PROMO_CODES: Record<string, number> = {
  ВЗБАДРИСЬ10: 10,
  ВЗБАДРИСЬ15: 15,
  KAMA10: 10,
};

const REFERRAL_DISCOUNT = 5; // скидка покупателю по реферальному коду

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: "",
      promoDiscount: 0,
      promoType: null,
      referrerId: null,

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

      clearCart: () => set({ items: [], promoCode: "", promoDiscount: 0, promoType: null, referrerId: null }),

      applyPromo: (code, users = [], dynamicPromos = []) => {
        const upper = code.trim().toUpperCase();

        // 1. Динамические промокоды из promoStore (приоритет)
        const dynamic = dynamicPromos.find((p) => p.code === upper);
        if (dynamic) {
          set({ promoCode: upper, promoDiscount: dynamic.discount, promoType: "promo", referrerId: null });
          return { ok: true, type: "promo" };
        }

        // 2. Статические промокоды (запасной вариант)
        const pct = FALLBACK_PROMO_CODES[upper];
        if (pct) {
          set({ promoCode: upper, promoDiscount: pct, promoType: "promo", referrerId: null });
          return { ok: true, type: "promo" };
        }

        // 3. Реферальные коды пользователей
        const referrer = users.find((u) => u.referralCode === upper);
        if (referrer) {
          set({ promoCode: upper, promoDiscount: REFERRAL_DISCOUNT, promoType: "referral", referrerId: referrer.id });
          return { ok: true, type: "referral" };
        }

        return { ok: false, error: "Промокод не найден или недействителен" };
      },

      removePromo: () => set({ promoCode: "", promoDiscount: 0, promoType: null, referrerId: null }),

      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
      subtotal: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
      discount: () => Math.round((get().subtotal() * get().promoDiscount) / 100),
      total: () => get().subtotal() - get().discount(),
    }),
    { name: "vzbadrys-cart" }
  )
);
