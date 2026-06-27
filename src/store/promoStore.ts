"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface PromoCode {
  id: string;
  code: string;
  discount: number;
  active: boolean;
  createdAt: string;
  usageCount: number;
  expiresAt?: string; // ISO date string, undefined = бессрочный
}

interface PromoStore {
  promos: PromoCode[];
  addPromo: (code: string, discount: number, expiresAt?: string) => { ok: boolean; error?: string };
  togglePromo: (id: string) => void;
  deletePromo: (id: string) => void;
  incrementUsage: (code: string) => void;
  getActivePromos: () => PromoCode[];
}

function generateId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export const usePromoStore = create<PromoStore>()(
  persist(
    (set, get) => ({
      promos: [
        { id: "1", code: "ВЗБАДРИСЬ10", discount: 10, active: true, createdAt: new Date().toISOString(), usageCount: 0 },
        { id: "2", code: "ВЗБАДРИСЬ15", discount: 15, active: true, createdAt: new Date().toISOString(), usageCount: 0 },
        { id: "3", code: "KAMA10", discount: 10, active: true, createdAt: new Date().toISOString(), usageCount: 0 },
      ],

      addPromo: (code, discount, expiresAt) => {
        const { promos } = get();
        const normalized = code.trim().toUpperCase();
        if (!normalized) return { ok: false, error: "Введите код" };
        if (discount < 1 || discount > 100) return { ok: false, error: "Скидка должна быть от 1 до 100%" };
        if (promos.find((p) => p.code === normalized))
          return { ok: false, error: "Такой промокод уже существует" };
        if (expiresAt && new Date(expiresAt) <= new Date())
          return { ok: false, error: "Дата окончания должна быть в будущем" };

        set((s) => ({
          promos: [
            ...s.promos,
            {
              id: generateId(),
              code: normalized,
              discount,
              active: true,
              createdAt: new Date().toISOString(),
              usageCount: 0,
              expiresAt: expiresAt || undefined,
            },
          ],
        }));
        return { ok: true };
      },

      togglePromo: (id) =>
        set((s) => ({
          promos: s.promos.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
        })),

      deletePromo: (id) =>
        set((s) => ({ promos: s.promos.filter((p) => p.id !== id) })),

      incrementUsage: (code) =>
        set((s) => ({
          promos: s.promos.map((p) =>
            p.code === code ? { ...p, usageCount: p.usageCount + 1 } : p
          ),
        })),

      getActivePromos: () => {
        const now = new Date();
        return get().promos.filter((p) => {
          if (!p.active) return false;
          if (p.expiresAt && new Date(p.expiresAt) < now) return false;
          return true;
        });
      },
    }),
    { name: "vzbadrys-promos" }
  )
);
