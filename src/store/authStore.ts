"use client";

import type { User as SupabaseUser } from "@supabase/supabase-js";
import { create } from "zustand";

import { supabase } from "@/lib/supabase";

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface Order {
  id: string;
  date: string;
  status: "processing" | "confirmed" | "shipped" | "ready_for_pickup" | "delivered" | "cancelled";
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryCost: number;
  total: number;
  promoCode?: string;
  promoDiscountPercent?: number;
  deliveryMethod: string;
  deliveryAddress: string;
  deliveryRegion?: string;
  deliveryCity?: string;
  deliveryAddressLine?: string;
  paymentMethod: string;
  comment?: string;
  trackNumber?: string;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
  paymentStatus?: string;
  paidAt?: string;
  stockWrittenOff?: boolean;
  isTest?: boolean;
  canDelete?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  createdAt: string;
  bonusPoints: number;
  referralCode: string;
  favorites: string[];
}

type ActionResult = {
  ok: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
};

interface AuthStore {
  user: User | null;
  users: User[];
  orders: Order[];
  isLoading: boolean;
  initialized: boolean;

  initialize: () => Promise<void>;
  register: (data: {
    name: string;
    email: string;
    phone: string;
    password: string;
    privacyAccepted: boolean;
    personalDataAccepted: boolean;
    marketingAccepted: boolean;
  }) => Promise<ActionResult>;
  login: (email: string, password: string) => Promise<ActionResult>;
  logout: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string; phone?: string; avatar?: string }) => Promise<ActionResult>;
  changePassword: (current: string, next: string) => Promise<ActionResult>;
  toggleFavorite: (productId: string) => Promise<void>;
  isFavorite: (productId: string) => boolean;
  loadOrders: () => Promise<void>;
  addOrder: (order: Omit<Order, "id" | "date" | "status">) => string;
  getUserOrders: () => Order[];
  addBonusToUser: (userId: string, points: number) => void;
  updateOrderStatus: (orderId: string, status: Order["status"], trackNumber?: string) => void;
  getAllOrders: () => Order[];
}

const STATUS_LABELS: Record<Order["status"], string> = {
  processing: "Новый",
  confirmed: "На сборке",
  shipped: "Передан в доставку",
  ready_for_pickup: "Доставлен в пункт выдачи",
  delivered: "Завершён",
  cancelled: "Отменён",
};

export { STATUS_LABELS };

function referralCode(user: SupabaseUser) {
  const existing = String(user.user_metadata?.referralCode || "");
  if (existing) return existing;
  return `VZB${user.id.replaceAll("-", "").slice(0, 7).toUpperCase()}`;
}

function mapUser(user: SupabaseUser): User {
  const metadata = user.user_metadata || {};
  return {
    id: user.id,
    name: String(metadata.name || user.email?.split("@")[0] || "Покупатель"),
    email: user.email || "",
    phone: String(metadata.phone || user.phone || ""),
    avatar: String(metadata.avatar || ""),
    createdAt: user.created_at,
    bonusPoints: Number(metadata.bonusPoints || 0),
    referralCode: referralCode(user),
    favorites: Array.isArray(metadata.favorites) ? metadata.favorites.map(String) : [],
  };
}

let authListenerCreated = false;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  users: [],
  orders: [],
  isLoading: true,
  initialized: false,

  initialize: async () => {
    if (get().initialized || !supabase) {
      set({ initialized: true, isLoading: false });
      return;
    }
    const { data } = await supabase.auth.getSession();
    const currentUser = data.session?.user ? mapUser(data.session.user) : null;
    set({ user: currentUser, initialized: true, isLoading: false });
    if (currentUser) await get().loadOrders();

    if (!authListenerCreated) {
      authListenerCreated = true;
      supabase.auth.onAuthStateChange((_event, session) => {
        const nextUser = session?.user ? mapUser(session.user) : null;
        set({ user: nextUser, orders: nextUser ? get().orders : [] });
        if (nextUser) void get().loadOrders();
      });
    }
  },

  register: async ({ name, email, phone, password, privacyAccepted, personalDataAccepted, marketingAccepted }) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, phone, password, privacyAccepted, personalDataAccepted, marketingAccepted }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return { ok: false, error: data.error || "Не удалось зарегистрироваться" };
    return { ok: true, requiresEmailConfirmation: Boolean(data.requiresEmailConfirmation) };
  },

  login: async (email, password) => {
    if (!supabase) return { ok: false, error: "Авторизация пока не настроена" };
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error || !data.user) {
      return { ok: false, error: error?.message || "Не удалось войти" };
    }
    set({ user: mapUser(data.user) });
    // Вход не должен зависеть от загрузки истории заказов: при медленном
    // соединении с сервером пользователь уже авторизован, а список заказов
    // спокойно подгрузится в фоне.
    void get().loadOrders();
    return { ok: true };
  },

  logout: async () => {
    if (supabase) await supabase.auth.signOut();
    set({ user: null, orders: [] });
  },

  updateProfile: async ({ name, email, phone, avatar }) => {
    if (!supabase || !get().user) return { ok: false, error: "Не авторизован" };
    const current = get().user!;
    const metadata = {
      name: name?.trim() || current.name,
      phone: phone?.trim() ?? current.phone,
      avatar: avatar ?? current.avatar ?? "",
      bonusPoints: current.bonusPoints,
      referralCode: current.referralCode,
      favorites: current.favorites,
    };
    const attributes: { data: typeof metadata; email?: string } = { data: metadata };
    if (email?.trim() && email.trim().toLowerCase() !== current.email) {
      attributes.email = email.trim().toLowerCase();
    }
    const { data, error } = await supabase.auth.updateUser(attributes);
    if (error || !data.user) return { ok: false, error: error?.message || "Не удалось сохранить" };
    set({ user: mapUser(data.user) });
    return { ok: true };
  },

  changePassword: async (current, next) => {
    if (!supabase || !get().user) return { ok: false, error: "Не авторизован" };
    const email = get().user!.email;
    const verified = await supabase.auth.signInWithPassword({ email, password: current });
    if (verified.error) return { ok: false, error: "Текущий пароль неверный" };
    const { error } = await supabase.auth.updateUser({ password: next });
    return error ? { ok: false, error: error.message } : { ok: true };
  },

  toggleFavorite: async (productId) => {
    const user = get().user;
    if (!supabase || !user) return;
    const favorites = user.favorites.includes(productId)
      ? user.favorites.filter((id) => id !== productId)
      : [...user.favorites, productId];
    set({ user: { ...user, favorites } });
    const { data, error } = await supabase.auth.updateUser({
      data: {
        name: user.name,
        phone: user.phone,
        avatar: user.avatar || "",
        bonusPoints: user.bonusPoints,
        referralCode: user.referralCode,
        favorites,
      },
    });
    if (error) set({ user });
    else if (data.user) set({ user: mapUser(data.user) });
  },

  isFavorite: (productId) => get().user?.favorites.includes(productId) ?? false,

  loadOrders: async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      set({ orders: [] });
      return;
    }
    const response = await fetch("/api/account/orders", {
      headers: { authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!response.ok) return;
    const payload = await response.json();
    if (Array.isArray(payload.orders)) set({ orders: payload.orders });
  },

  addOrder: () => "",
  getUserOrders: () => get().orders,
  addBonusToUser: () => undefined,
  updateOrderStatus: (orderId, status, trackNumber) => {
    set({
      orders: get().orders.map((order) =>
        order.id === orderId ? { ...order, status, trackNumber } : order
      ),
    });
  },
  getAllOrders: () => get().orders,
}));
