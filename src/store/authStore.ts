"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  status: "processing" | "confirmed" | "shipped" | "delivered" | "cancelled";
  items: OrderItem[];
  subtotal: number;
  discount: number;
  deliveryCost: number;
  total: number;
  promoCode?: string;
  promoDiscountPercent?: number;
  deliveryMethod: string;
  deliveryAddress: string;
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
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string; // base64 или data URL
  createdAt: string;
  bonusPoints: number;
  referralCode: string;
  favorites: string[]; // product ids
}

interface AuthStore {
  user: User | null;
  users: (User & { passwordHash: string })[];
  orders: Order[];
  isLoading: boolean;

  register: (data: { name: string; email: string; phone: string; password: string }) => { ok: boolean; error?: string };
  login: (emailOrPhone: string, password: string) => { ok: boolean; error?: string };
  logout: () => void;
  updateProfile: (data: { name?: string; email?: string; phone?: string; avatar?: string }) => { ok: boolean; error?: string };
  changePassword: (current: string, next: string) => { ok: boolean; error?: string };
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  addOrder: (order: Omit<Order, "id" | "date" | "status">) => string;
  getUserOrders: () => Order[];
  addBonusToUser: (userId: string, points: number) => void;
  updateOrderStatus: (orderId: string, status: Order["status"], trackNumber?: string) => void;
  getAllOrders: () => Order[];
}

function hashPassword(password: string): string {
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36) + password.length.toString(36);
}

function generateId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

function generateReferral(name: string) {
  return (name.slice(0, 3) + generateId().slice(0, 5)).toUpperCase();
}

const STATUS_LABELS: Record<Order["status"], string> = {
  processing: "Новый / оплачен",
  confirmed: "На сборке",
  shipped: "Передан в доставку",
  delivered: "Завершён",
  cancelled: "Отменён",
};

export { STATUS_LABELS };

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      users: [],
      orders: [],
      isLoading: false,

      register: ({ name, email, phone, password }) => {
        const { users } = get();
        const emailNorm = email.trim().toLowerCase();
        const phoneNorm = phone.replace(/\D/g, "");

        if (users.find((u) => u.email === emailNorm))
          return { ok: false, error: "Этот email уже зарегистрирован" };
        if (users.find((u) => u.phone.replace(/\D/g, "") === phoneNorm))
          return { ok: false, error: "Этот номер телефона уже зарегистрирован" };
        if (password.length < 6)
          return { ok: false, error: "Пароль должен быть не менее 6 символов" };

        const newUser: User & { passwordHash: string } = {
          id: generateId(),
          name: name.trim(),
          email: emailNorm,
          phone: phone.trim(),
          createdAt: new Date().toISOString(),
          bonusPoints: 0,
          referralCode: generateReferral(name),
          favorites: [],
          passwordHash: hashPassword(password),
        };

        set((s) => ({ users: [...s.users, newUser] }));
        const { passwordHash, ...userPublic } = newUser;
        set({ user: userPublic });
        return { ok: true };
      },

      login: (emailOrPhone, password) => {
        const { users } = get();
        const norm = emailOrPhone.trim().toLowerCase();
        const phoneNorm = emailOrPhone.replace(/\D/g, "");
        const found = users.find(
          (u) => u.email === norm || u.phone.replace(/\D/g, "") === phoneNorm
        );
        if (!found) return { ok: false, error: "Пользователь не найден" };
        if (found.passwordHash !== hashPassword(password))
          return { ok: false, error: "Неверный пароль" };
        const { passwordHash, ...userPublic } = found;
        set({ user: userPublic });
        return { ok: true };
      },

      logout: () => set({ user: null }),

      updateProfile: ({ name, email, phone, avatar }) => {
        const { user, users } = get();
        if (!user) return { ok: false, error: "Не авторизован" };

        const emailNorm = email?.trim().toLowerCase();
        if (emailNorm && emailNorm !== user.email) {
          if (users.find((u) => u.id !== user.id && u.email === emailNorm))
            return { ok: false, error: "Этот email уже используется" };
        }
        const phoneNorm = phone?.replace(/\D/g, "");
        if (phoneNorm && phone !== user.phone) {
          if (users.find((u) => u.id !== user.id && u.phone.replace(/\D/g, "") === phoneNorm))
            return { ok: false, error: "Этот телефон уже используется" };
        }

        const updates: Partial<User> = {};
        if (name) updates.name = name.trim();
        if (emailNorm) updates.email = emailNorm;
        if (phone) updates.phone = phone.trim();
        if (avatar !== undefined) updates.avatar = avatar;

        const updatedUser = { ...user, ...updates };
        set({
          user: updatedUser,
          users: users.map((u) => u.id === user.id ? { ...u, ...updates } : u),
        });
        return { ok: true };
      },

      changePassword: (current, next) => {
        const { user, users } = get();
        if (!user) return { ok: false, error: "Не авторизован" };
        const found = users.find((u) => u.id === user.id);
        if (!found) return { ok: false, error: "Пользователь не найден" };
        if (found.passwordHash !== hashPassword(current))
          return { ok: false, error: "Текущий пароль неверный" };
        if (next.length < 6)
          return { ok: false, error: "Новый пароль должен быть не менее 6 символов" };
        set({
          users: users.map((u) =>
            u.id === user.id ? { ...u, passwordHash: hashPassword(next) } : u
          ),
        });
        return { ok: true };
      },

      toggleFavorite: (productId) => {
        const { user } = get();
        if (!user) return;
        const isFav = user.favorites.includes(productId);
        const newFavs = isFav
          ? user.favorites.filter((id) => id !== productId)
          : [...user.favorites, productId];
        const updatedUser = { ...user, favorites: newFavs };
        set({
          user: updatedUser,
          users: get().users.map((u) =>
            u.id === user.id ? { ...u, favorites: newFavs } : u
          ),
        });
      },

      isFavorite: (productId) => {
        const { user } = get();
        return user?.favorites.includes(productId) ?? false;
      },

      updateOrderStatus: (orderId, status, trackNumber) => {
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId ? { ...o, status, ...(trackNumber ? { trackNumber } : {}) } : o
          ),
        }));
      },

      getAllOrders: () => get().orders,

      addOrder: (orderData) => {
        const { user } = get();
        if (!user) return "";
        const orderId = "ВЗБ-" + generateId();
        const order: Order = {
          ...orderData,
          id: orderId,
          date: new Date().toISOString(),
          status: "processing",
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userPhone: user.phone,
        };
        set((s) => ({ orders: [order, ...s.orders] }));
        const bonusEarned = Math.floor(orderData.total * 0.01);
        set((s) => ({
          user: s.user ? { ...s.user, bonusPoints: s.user.bonusPoints + bonusEarned } : null,
          users: s.users.map((u) => u.id === user.id ? { ...u, bonusPoints: u.bonusPoints + bonusEarned } : u),
        }));
        return orderId;
      },

      getUserOrders: () => {
        const { orders } = get();
        return orders;
      },

      addBonusToUser: (userId, points) => {
        set((s) => ({
          users: s.users.map((u) => u.id === userId ? { ...u, bonusPoints: u.bonusPoints + points } : u),
          user: s.user?.id === userId ? { ...s.user, bonusPoints: s.user.bonusPoints + points } : s.user,
        }));
      },
    }),
    { name: "vzbadrys-auth" }
  )
);
