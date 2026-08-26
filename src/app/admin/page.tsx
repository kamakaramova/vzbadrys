"use client";
import { useState, useMemo, useEffect } from "react";
import { useAuthStore, Order, STATUS_LABELS } from "@/store/authStore";
import {
  BarChart2, Users, ShoppingBag, TrendingUp,
  Search, Download, ChevronUp, ChevronDown,
  X, Check, Package, Eye, Tag, Trash2, ToggleLeft, ToggleRight,
  Edit2, ImageIcon, Mail, Send, UserPlus, RefreshCw, Link2, MessageCircle,
} from "lucide-react";
import { useProductStore } from "@/store/productStore";
import { Product, WeightVariant } from "@/lib/products";
import type { CellObject, SheetData } from "write-excel-file/browser";
import SalesDynamicsChart from "@/components/admin/SalesDynamicsChart";
import ShipmentsWorkspace from "@/components/admin/ShipmentsWorkspace";
import InventoryWorkspace from "@/components/admin/InventoryWorkspace";
import FinanceWorkspace from "@/components/admin/FinanceWorkspace";

type Tab = "dashboard" | "orders" | "shipments" | "inventory" | "finance" | "customers" | "feedback" | "promos" | "products" | "emails" | "integrations";
type SortField = "name" | "email" | "totalSpent" | "ordersCount" | "avgCheck" | "lastOrder" | "createdAt";
type SortDir = "asc" | "desc";
type OrderSortField = "date" | "total" | "status" | "userName";
type EmailLog = {
  id: string;
  recipient: string;
  subject: string;
  kind: string;
  order_id?: string;
  status: "sent" | "failed";
  error?: string;
  created_at: string;
};
type MarketingContact = {
  email: string;
  name: string;
  phone: string;
  consentAt: string;
  source: "registration" | "order" | "registration_and_order";
};
type AdminPromo = { id: string; code: string; ownerName?: string; discount: number; active: boolean; createdAt: string; usageCount: number; expiresAt?: string };
type LoyaltyStats = {
  promos: Array<{ code: string; ownerName: string | null; discountPercent: number; active: boolean; paidOrders: number; revenue: number; recordedUses: number }>;
  referrals: Array<{ ownerId: string; ownerName: string; ownerEmail: string; code: string; discountPercent: number; paidOrders: number; revenue: number }>;
};
type DeliverySettings = {
  enabled: { pickup: boolean; sdek_pvz: boolean; yandex_pvz: boolean; ozon_pvz: boolean; pochta: boolean };
  pochtaWidgetId: number;
};
type FeedbackItem = {
  id: string;
  product_id: string;
  author_name: string;
  author_email?: string | null;
  body: string;
  answer?: string | null;
  answered_at?: string | null;
  is_published: boolean;
  created_at: string;
  rating?: number;
  image_url?: string | null;
};
type FeedbackResponse = { id: string; feedback_type: "review" | "question"; feedback_id: string; body: string; created_at: string };
const DEFAULT_DELIVERY_SETTINGS: DeliverySettings = {
  enabled: { pickup: true, sdek_pvz: true, yandex_pvz: true, ozon_pvz: true, pochta: true },
  pochtaWidgetId: 62722,
};

const STATUS_COLORS: Record<Order["status"], string> = {
  processing: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  ready_for_pickup: "bg-cyan-100 text-cyan-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  creating: { label: "Создаётся", color: "bg-gray-100 text-gray-600" },
  awaiting_payment: { label: "Ожидает оплаты", color: "bg-yellow-100 text-yellow-700" },
  authorized: { label: "Авторизован", color: "bg-blue-100 text-blue-700" },
  processing_payment: { label: "Платёж обрабатывается", color: "bg-blue-100 text-blue-700" },
  paid: { label: "Оплачен", color: "bg-green-100 text-green-700" },
  payment_failed: { label: "Оплата отменена", color: "bg-red-100 text-red-600" },
  payment_processing_error: { label: "Ошибка обработки", color: "bg-red-100 text-red-600" },
  creation_failed: { label: "Не создан", color: "bg-red-100 text-red-600" },
};

function paymentStatusInfo(status?: string) {
  return PAYMENT_STATUS[status ?? ""] ?? {
    label: status || "Нет данных",
    color: "bg-gray-100 text-gray-600",
  };
}

function shortDeliveryMethod(method?: string) {
  const value = (method || "").toLowerCase();
  if (value.includes("ozon") || value.includes("озон")) return "Ozon";
  if (value.includes("почт")) return "Почта";
  if (value.includes("самовывоз") || value === "pickup") return "Самовывоз";
  if (value.includes("сдэк") || value.includes("sdek")) return "СДЭК";
  if (value.includes("яндекс") || value.includes("yandex")) return "Яндекс";
  return "Доставка";
}

function orderBadge(order: Order) {
  if (order.paymentStatus !== "paid") {
    return paymentStatusInfo(order.paymentStatus);
  }
  return {
    label: STATUS_LABELS[order.status],
    color: STATUS_COLORS[order.status],
  };
}

function pendingOrdersLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `есть ещё ${count} неотправленный заказ`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `есть ещё ${count} неотправленных заказа`;
  return `есть ещё ${count} неотправленных заказов`;
}

function exportCSV(rows: Record<string, string | number>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(";"),
    ...rows.map((r) =>
      headers.map((h) => `"${String(r[h]).replace(/"/g, '""')}"`).join(";")
    ),
  ].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function SIcon({ f, cur, dir }: { f: string; cur: string; dir: SortDir }) {
  return (
    <span className="inline-flex ml-1 opacity-40">
      {cur === f ? (dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} />}
    </span>
  );
}

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setMounted(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [customerSearch, setCustomerSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("totalSpent");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [orderSortField, setOrderSortField] = useState<OrderSortField>("date");
  const [orderSortDir, setOrderSortDir] = useState<SortDir>("desc");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<Order["status"]>("processing");
  const [editTrack, setEditTrack] = useState("");
  const [statusSaved, setStatusSaved] = useState(false);
  const [editingOrderContacts, setEditingOrderContacts] = useState(false);
  const [editOrderEmail, setEditOrderEmail] = useState("");
  const [editOrderPhone, setEditOrderPhone] = useState("");
  const [editOrderRegion, setEditOrderRegion] = useState("");
  const [editOrderCity, setEditOrderCity] = useState("");
  const [editOrderAddress, setEditOrderAddress] = useState("");
  const [orderContactsSaving, setOrderContactsSaving] = useState(false);
  const [orderContactsMessage, setOrderContactsMessage] = useState("");
  const [dbOrders, setDbOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [excelExporting, setExcelExporting] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [ordersSyncMessage, setOrdersSyncMessage] = useState("");
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [testRecipient, setTestRecipient] = useState("vzbadris@yandex.ru");
  const [manualRecipient, setManualRecipient] = useState("");
  const [manualSubject, setManualSubject] = useState("");
  const [manualText, setManualText] = useState("");
  const [manualEmailLoading, setManualEmailLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState("");
  const [testCredentials, setTestCredentials] = useState<{ email: string; password: string } | null>(null);
  const [marketingContacts, setMarketingContacts] = useState<MarketingContact[]>([]);
  const [marketingLoading, setMarketingLoading] = useState(false);
  const [marketingError, setMarketingError] = useState("");
  const [ozonConnecting, setOzonConnecting] = useState(false);
  const [ozonConnectError, setOzonConnectError] = useState("");
  const [ozonStatusLoading, setOzonStatusLoading] = useState(false);
  const [ozonStatusMessage, setOzonStatusMessage] = useState("");
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings>(DEFAULT_DELIVERY_SETTINGS);
  const [deliverySettingsLoading, setDeliverySettingsLoading] = useState(false);
  const [deliverySettingsMessage, setDeliverySettingsMessage] = useState("");
  const [orderEmailLogs, setOrderEmailLogs] = useState<EmailLog[]>([]);
  const [orderEmailLogsLoading, setOrderEmailLogsLoading] = useState(false);
  const [feedbackReviews, setFeedbackReviews] = useState<FeedbackItem[]>([]);
  const [feedbackQuestions, setFeedbackQuestions] = useState<FeedbackItem[]>([]);
  const [feedbackResponses, setFeedbackResponses] = useState<FeedbackResponse[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [feedbackSaving, setFeedbackSaving] = useState<string | null>(null);

  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoOwner, setNewPromoOwner] = useState("");
  const [newPromoDiscount, setNewPromoDiscount] = useState("");
  const [promoHasExpiry, setPromoHasExpiry] = useState(false);
  const [newPromoExpiry, setNewPromoExpiry] = useState("");
  const [promoFormError, setPromoFormError] = useState("");
  const [promoAdded, setPromoAdded] = useState(false);
  const [dbPromos, setDbPromos] = useState<AdminPromo[]>([]);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoLoadError, setPromoLoadError] = useState("");
  const [loyaltyStats, setLoyaltyStats] = useState<LoyaltyStats | null>(null);
  const [loyaltyStatsError, setLoyaltyStatsError] = useState("");

  // Состояние редактора товаров
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productSaved, setProductSaved] = useState(false);
  const [productsSaving, setProductsSaving] = useState(false);
  const [productsMessage, setProductsMessage] = useState("");

  const openProductEditor = (product: Product) => {
    if (product.category !== "seeds" || (product.weightVariants?.length ?? 0) > 0) {
      setEditingProduct({ ...product });
      return;
    }

    const standardWeights = [100, 200, 500, 1000];
    setEditingProduct({
      ...product,
      weightVariants: standardWeights.map((grams) => ({
        grams,
        label: grams === 1000 ? "1 кг" : `${grams} г`,
        price: product.price,
      })),
    });
  };

  const updateSeedVariant = (index: number, updates: Partial<WeightVariant>) => {
    if (!editingProduct) return;
    const variants = [...(editingProduct.weightVariants ?? [])];
    variants[index] = { ...variants[index], ...updates };
    setEditingProduct({ ...editingProduct, weightVariants: variants });
  };

  const store = useAuthStore();
  const productStore = useProductStore();

  useEffect(() => { if (mounted) productStore.init(); }, [mounted]);

  const users = mounted ? store.users : [];
  const orders = mounted ? dbOrders : [];
  const promos = mounted ? dbPromos : [];
  const allProducts = mounted ? productStore.products : [];
  const { updateProduct, deleteProduct, toggleStock, resetToDefault, setAdminPassword, seedDatabase } = productStore;

  const openOrderDetails = (order: Order) => {
    setSelectedOrder(order);
    setEditStatus(order.status);
    setEditTrack(order.trackNumber ?? "");
    setStatusSaved(false);
    setEditingOrderContacts(false);
    setEditOrderEmail(order.userEmail ?? "");
    setEditOrderPhone(order.userPhone ?? "");
    setEditOrderRegion(order.deliveryRegion ?? "");
    setEditOrderCity(order.deliveryCity ?? "");
    setEditOrderAddress(order.deliveryAddressLine ?? order.deliveryAddress ?? "");
    setOrderContactsMessage("");
    setOrderEmailLogs([]);
    void loadOrderEmailLogs(order.id);
  };

  const loadAdminOrders = async (password = pw) => {
    if (!password) return;
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const response = await fetch("/api/admin/orders", {
        headers: { "x-admin-password": password },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.orders)) {
        throw new Error(data.error || "Не удалось загрузить заказы");
      }
      setDbOrders(data.orders as Order[]);
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : "Не удалось загрузить заказы");
    } finally {
      setOrdersLoading(false);
    }
  };

  const syncPaymentStatuses = async () => {
    if (!pw) return;
    setOrdersLoading(true);
    setOrdersError("");
    setOrdersSyncMessage("");
    try {
      const response = await fetch("/api/admin/orders/sync-payment-statuses", {
        method: "POST",
        headers: { "x-admin-password": pw },
        cache: "no-store",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Не удалось запросить статусы у Ozon");
      await loadAdminOrders(pw);
      const problems = Array.isArray(data.problems) ? data.problems.length : 0;
      setOrdersSyncMessage(
        problems
          ? `Сверка завершена: обновлено ${Number(data.changed ?? 0)} из ${Number(data.checked ?? 0)}. По ${problems} заказам Ozon пока не дал статус.`
          : `Сверка с Ozon завершена: проверено ${Number(data.checked ?? 0)}, обновлено ${Number(data.changed ?? 0)}.`
      );
    } catch (error) {
      setOrdersError(error instanceof Error ? error.message : "Не удалось запросить статусы у Ozon");
    } finally {
      setOrdersLoading(false);
    }
  };

  const loadPromos = async (password = pw) => {
    if (!password) return;
    setPromoLoading(true);
    setPromoLoadError("");
    try {
      const response = await fetch("/api/admin/promos", { headers: { "x-admin-password": password }, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.promos)) throw new Error(data.error || "Не удалось загрузить промокоды");
      setDbPromos(data.promos.map((promo: Record<string, unknown>) => ({
        id: String(promo.id), code: String(promo.code), ownerName: promo.owner_name ? String(promo.owner_name) : undefined,
        discount: Number(promo.discount_percent), active: Boolean(promo.active), createdAt: String(promo.created_at),
        usageCount: Number(promo.usage_count), expiresAt: promo.expires_at ? String(promo.expires_at) : undefined,
      })));
    } catch (error) {
      setPromoLoadError(error instanceof Error ? error.message : "Не удалось загрузить промокоды");
    } finally {
      setPromoLoading(false);
    }
  };

  const loadLoyaltyStats = async (password = pw) => {
    if (!password) return;
    setLoyaltyStatsError("");
    try {
      const response = await fetch("/api/admin/loyalty-stats", { headers: { "x-admin-password": password }, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.promos) || !Array.isArray(data.referrals)) throw new Error(data.error || "Не удалось загрузить статистику");
      setLoyaltyStats(data as LoyaltyStats);
    } catch (error) {
      setLoyaltyStatsError(error instanceof Error ? error.message : "Не удалось загрузить статистику");
    }
  };

  const loadEmailLogs = async () => {
    if (!pw) return;
    setEmailLoading(true);
    try {
      const response = await fetch("/api/admin/emails", {
        headers: { "x-admin-password": pw },
        cache: "no-store",
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.logs)) {
        setEmailLogs(data.logs);
        setEmailMessage("");
      } else if (data.error === "email_logs_not_created") {
        setEmailMessage("Сначала создайте таблицу email_logs в Supabase.");
      } else {
        setEmailMessage(data.error || "Не удалось загрузить журнал");
      }
    } finally {
      setEmailLoading(false);
    }
  };

  const loadMarketingContacts = async () => {
    if (!pw) return;
    setMarketingLoading(true);
    setMarketingError("");
    try {
      const response = await fetch("/api/admin/marketing-contacts", {
        headers: { "x-admin-password": pw },
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.contacts)) {
        throw new Error(data.error || "Не удалось загрузить список");
      }
      setMarketingContacts(data.contacts as MarketingContact[]);
    } catch (error) {
      setMarketingError(error instanceof Error ? error.message : "Не удалось загрузить список");
    } finally {
      setMarketingLoading(false);
    }
  };

  const loadDeliverySettings = async () => {
    if (!pw) return;
    setDeliverySettingsLoading(true);
    setDeliverySettingsMessage("");
    try {
      const response = await fetch("/api/admin/delivery-settings", { headers: { "x-admin-password": pw }, cache: "no-store" });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error === "delivery_settings_not_created" ? "Нужно один раз добавить таблицу настроек доставки в Supabase." : data?.error || "Не удалось загрузить настройки");
      setDeliverySettings(data as DeliverySettings);
    } catch (error) {
      setDeliverySettingsMessage(error instanceof Error ? error.message : "Не удалось загрузить настройки");
    } finally {
      setDeliverySettingsLoading(false);
    }
  };

  const saveDeliverySettings = async () => {
    if (!pw) return;
    setDeliverySettingsLoading(true);
    setDeliverySettingsMessage("");
    try {
      const response = await fetch("/api/admin/delivery-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-password": pw },
        body: JSON.stringify(deliverySettings),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error === "delivery_settings_not_created" ? "Нужно один раз добавить таблицу настроек доставки в Supabase." : data?.error || "Не удалось сохранить настройки");
      setDeliverySettings(data as DeliverySettings);
      setDeliverySettingsMessage("Настройки доставки сохранены. Покупатели увидят изменения сразу.");
    } catch (error) {
      setDeliverySettingsMessage(error instanceof Error ? error.message : "Не удалось сохранить настройки");
    } finally {
      setDeliverySettingsLoading(false);
    }
  };

  const loadOrderEmailLogs = async (orderId: string) => {
    if (!pw) return;
    setOrderEmailLogsLoading(true);
    try {
      const response = await fetch(`/api/admin/emails?orderId=${encodeURIComponent(orderId)}`, { headers: { "x-admin-password": pw }, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      setOrderEmailLogs(response.ok && Array.isArray(data.logs) ? data.logs as EmailLog[] : []);
    } finally {
      setOrderEmailLogsLoading(false);
    }
  };

  const loadFeedback = async (password = pw) => {
    if (!password) return;
    setFeedbackLoading(true);
    setFeedbackError("");
    try {
      const response = await fetch("/api/admin/feedback", { headers: { "x-admin-password": password }, cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.reviews) || !Array.isArray(data.questions) || !Array.isArray(data.responses)) throw new Error(data.error || "Не удалось загрузить отзывы и вопросы");
      setFeedbackReviews(data.reviews as FeedbackItem[]);
      setFeedbackQuestions(data.questions as FeedbackItem[]);
      setFeedbackResponses(data.responses as FeedbackResponse[]);
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Не удалось загрузить отзывы и вопросы");
    } finally {
      setFeedbackLoading(false);
    }
  };

  const saveFeedback = async (type: "review" | "question", item: FeedbackItem, isPublished?: boolean) => {
    if (!pw || feedbackSaving) return;
    setFeedbackSaving(`${type}:${item.id}`);
    setFeedbackError("");
    try {
      const response = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-password": pw },
        body: JSON.stringify({ id: item.id, type, answer: feedbackDrafts[`${type}:${item.id}`] ?? "", ...(isPublished === undefined ? {} : { isPublished }) }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Не удалось сохранить ответ");
      const update = (current: FeedbackItem[]) => current.map((entry) => entry.id === item.id ? { ...entry, ...data.item } : entry);
      if (type === "review") setFeedbackReviews(update); else setFeedbackQuestions(update);
      if (data.response) setFeedbackResponses((current) => [data.response as FeedbackResponse, ...current]);
      setFeedbackDrafts((drafts) => {
        const next = { ...drafts };
        delete next[`${type}:${item.id}`];
        return next;
      });
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Не удалось сохранить ответ");
    } finally {
      setFeedbackSaving(null);
    }
  };

  const deleteFeedback = async (type: "review" | "question", item: FeedbackItem) => {
    const label = type === "review" ? "отзыв" : "вопрос";
    if (!pw || !confirm(`Точно удалить ${label} от «${item.author_name}»? Восстановить его не получится.`)) return;
    setFeedbackSaving(`${type}:${item.id}`);
    setFeedbackError("");
    try {
      const response = await fetch(`/api/admin/feedback?type=${type}&id=${encodeURIComponent(item.id)}`, { method: "DELETE", headers: { "x-admin-password": pw } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Не удалось удалить обращение");
      if (type === "review") setFeedbackReviews((current) => current.filter((entry) => entry.id !== item.id));
      else setFeedbackQuestions((current) => current.filter((entry) => entry.id !== item.id));
      setFeedbackResponses((current) => current.filter((entry) => !(entry.feedback_type === type && entry.feedback_id === item.id)));
    } catch (error) {
      setFeedbackError(error instanceof Error ? error.message : "Не удалось удалить обращение");
    } finally {
      setFeedbackSaving(null);
    }
  };

  useEffect(() => {
    if (!mounted || authed) return;
    void fetch("/api/admin/login", { cache: "no-store" }).then(async (response) => {
      if (!response.ok) return;
      setPw("session");
      setAdminPassword("session");
      setAuthed(true);
      await Promise.all([
        loadAdminOrders("session"), loadPromos("session"),
        loadLoyaltyStats("session"), loadFeedback("session"),
      ]);
    }).catch(() => undefined);
  }, [mounted, authed]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (authed && tab === "emails") {
      const timer = window.setTimeout(() => {
        void loadEmailLogs();
        void loadMarketingContacts();
      }, 0);
      return () => window.clearTimeout(timer);
    }
  }, [authed, tab]);

  useEffect(() => {
    if (authed && tab === "promos") {
      void loadPromos();
      void loadLoyaltyStats();
    }
  }, [authed, tab]);

  useEffect(() => {
    if (authed && tab === "feedback") void loadFeedback();
  }, [authed, tab]);

  useEffect(() => {
    if (authed && tab === "integrations") void loadDeliverySettings();
  }, [authed, tab]);

  // Вход в админку — пароль проверяется на СЕРВЕРЕ, в коде сайта его нет.
  const doLogin = async () => {
    if (!pw.trim() || loggingIn) return;
    setLoggingIn(true);
    setPwError(false);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        setAuthed(true);
        setPw("session");
        setAdminPassword("session");
        await loadAdminOrders("session");
        await loadPromos("session");
        await loadLoyaltyStats("session");
        await loadFeedback("session");
      } else {
        setPwError(true);
      }
    } catch {
      setPwError(true);
    } finally {
      setLoggingIn(false);
    }
  };

  const customerStats = useMemo(() => {
    type CustomerProfile = {
      id: string;
      name: string;
      email: string;
      phone: string;
      createdAt: string;
      bonusPoints: number;
      referralCode: string;
    };
    type CustomerGroup = { keys: Set<string>; profiles: CustomerProfile[]; userOrders: Order[] };
    const groups: CustomerGroup[] = [];
    const groupByKey = new Map<string, CustomerGroup>();
    const identityKeys = (profile: Pick<CustomerProfile, "id" | "email" | "phone">) => {
      const email = profile.email.trim().toLowerCase();
      const phone = profile.phone.replace(/\D/g, "");
      return [
        email ? `email:${email}` : "",
        phone ? `phone:${phone}` : "",
        profile.id ? `user:${profile.id}` : "",
      ].filter(Boolean);
    };
    const addToGroup = (profile: CustomerProfile, order?: Order) => {
      const keys = identityKeys(profile);
      const matching = [...new Set(keys.map((key) => groupByKey.get(key)).filter(Boolean) as CustomerGroup[])];
      const group = matching[0] ?? { keys: new Set<string>(), profiles: [], userOrders: [] };
      if (!matching.length) groups.push(group);
      matching.slice(1).forEach((other) => {
        if (other === group) return;
        group.profiles.push(...other.profiles);
        group.userOrders.push(...other.userOrders);
        other.keys.forEach((key) => { group.keys.add(key); groupByKey.set(key, group); });
        groups.splice(groups.indexOf(other), 1);
      });
      group.profiles.push(profile);
      if (order) group.userOrders.push(order);
      keys.forEach((key) => { group.keys.add(key); groupByKey.set(key, group); });
    };

    users.forEach((user) => addToGroup(user));
    orders.forEach((order) => addToGroup({
      id: order.userId || "",
      name: order.userName || "Покупатель",
      email: order.userEmail || "",
      phone: order.userPhone || "",
      createdAt: order.date,
      bonusPoints: 0,
      referralCode: "—",
    }, order));

    return groups.map((group) => {
      const u = group.profiles.find((profile) => profile.name && profile.name !== "Покупатель") ?? group.profiles[0];
      const userOrders = group.userOrders;
      const paidUserOrders = userOrders.filter((order) => order.paymentStatus === "paid");
      const totalSpent = paidUserOrders.reduce((s, o) => s + o.total, 0);
      const ordersCount = paidUserOrders.length;
      const avgCheck = ordersCount > 0 ? Math.round(totalSpent / ordersCount) : 0;
      const sorted = [...paidUserOrders].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const lastOrder = sorted.length > 0 ? sorted[0].date : null;
      return { ...u, totalSpent, ordersCount, avgCheck, lastOrder, userOrders };
    });
  }, [users, orders]);

  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.total, 0);
  const avgCheck = paidOrders.length > 0 ? Math.round(totalRevenue / paidOrders.length) : 0;
  const activeCustomers = customerStats.filter((c) => c.ordersCount > 0).length;

  const sortedCustomers = useMemo(() => {
    const filtered = customerStats.filter((c) => {
      const q = customerSearch.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q)
      );
    });
    return [...filtered].sort((a, b) => {
      let va: number | string;
      let vb: number | string;
      if (sortField === "lastOrder") {
        va = a.lastOrder ? new Date(a.lastOrder).getTime() : 0;
        vb = b.lastOrder ? new Date(b.lastOrder).getTime() : 0;
      } else if (sortField === "createdAt") {
        va = new Date(a.createdAt).getTime();
        vb = new Date(b.createdAt).getTime();
      } else {
        va = (a as Record<string, unknown>)[sortField] as string ?? "";
        vb = (b as Record<string, unknown>)[sortField] as string ?? "";
      }
      if (typeof va === "string" && typeof vb === "string") {
        return sortDir === "asc"
          ? va.localeCompare(vb, "ru")
          : vb.localeCompare(va, "ru");
      }
      return sortDir === "asc"
        ? (va as number) - (vb as number)
        : (vb as number) - (va as number);
    });
  }, [customerStats, customerSearch, sortField, sortDir]);

  const sortedOrders = useMemo(() => {
    const filtered = orders.filter((o) => {
      const q = orderSearch.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        (o.userName ?? "").toLowerCase().includes(q) ||
        (o.userEmail ?? "").toLowerCase().includes(q)
      );
    });
    return [...filtered].sort((a, b) => {
      if (orderSortField === "date") {
        const d = new Date(b.date).getTime() - new Date(a.date).getTime();
        return orderSortDir === "desc" ? d : -d;
      }
      if (orderSortField === "total")
        return orderSortDir === "desc" ? b.total - a.total : a.total - b.total;
      if (orderSortField === "userName") {
        const va = (a.userName ?? "").toLowerCase();
        const vb = (b.userName ?? "").toLowerCase();
        return orderSortDir === "asc"
          ? va.localeCompare(vb, "ru")
          : vb.localeCompare(va, "ru");
      }
      if (orderSortField === "status")
        return orderSortDir === "asc"
          ? a.status.localeCompare(b.status)
          : b.status.localeCompare(a.status);
      return 0;
    });
  }, [orders, orderSearch, orderSortField, orderSortDir]);

  const relatedCustomerOrders = useMemo(() => {
    if (!selectedOrder) return [];
    const selectedEmail = (selectedOrder.userEmail ?? "").trim().toLowerCase();
    const selectedPhone = (selectedOrder.userPhone ?? "").replace(/\D/g, "");

    return orders
      .filter((order) => {
        if (order.id === selectedOrder.id) return false;
        if (order.status !== "processing" && order.status !== "confirmed") return false;
        if (selectedOrder.userId && order.userId === selectedOrder.userId) return true;
        const orderEmail = (order.userEmail ?? "").trim().toLowerCase();
        if (selectedEmail && orderEmail === selectedEmail) return true;
        const orderPhone = (order.userPhone ?? "").replace(/\D/g, "");
        return selectedPhone.length >= 10 && orderPhone === selectedPhone;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, selectedOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };
  const toggleOrderSort = (field: OrderSortField) => {
    if (orderSortField === field) setOrderSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setOrderSortField(field); setOrderSortDir("desc"); }
  };

  const exportCustomers = () =>
    exportCSV(
      sortedCustomers.map((c) => ({
        "Имя": c.name, "Email": c.email, "Телефон": c.phone,
        "Зарегистрирован": new Date(c.createdAt).toLocaleDateString("ru-RU"),
        "Заказов": c.ordersCount, "Сумма (руб)": c.totalSpent,
        "Средний чек (руб)": c.avgCheck,
        "Последний заказ": c.lastOrder ? new Date(c.lastOrder).toLocaleDateString("ru-RU") : "",
        "Бонусы": c.bonusPoints, "Реф. код": c.referralCode,
      })),
      `покупатели_${new Date().toISOString().slice(0, 10)}.csv`
    );

  const exportOrders = () =>
    exportCSV(
      sortedOrders.map((o) => ({
        "Номер": o.id, "Дата": new Date(o.date).toLocaleDateString("ru-RU"),
        "Покупатель": o.userName ?? "", "Email": o.userEmail ?? "",
        "Телефон": o.userPhone ?? "", "Статус": STATUS_LABELS[o.status],
        "Статус оплаты": paymentStatusInfo(o.paymentStatus).label,
        "Товары (руб)": o.subtotal, "Скидка (руб)": o.discount,
        "Доставка (руб)": o.deliveryCost, "Итого (руб)": o.total,
        "Промокод": o.promoCode ?? "", "Доставка": o.deliveryMethod,
        "Адрес": o.deliveryAddress, "Оплата": o.paymentMethod,
        "Трек": o.trackNumber ?? "",
      })),
      `заказы_${new Date().toISOString().slice(0, 10)}.csv`
    );

  const exportOrdersExcel = async () => {
    if (!orders.length || excelExporting) return;
    setExcelExporting(true);
    setOrdersError("");
    try {
      const { default: writeXlsxFile } = await import("write-excel-file/browser");
      const headers = [
        "Номер", "Дата", "Покупатель", "Email", "Телефон", "Статус заказа",
        "Статус оплаты", "Способ доставки", "Адрес доставки", "Состав заказа",
        "Товары, ₽", "Скидка, ₽", "Доставка, ₽", "Итого, ₽", "Промокод",
        "Способ оплаты", "Трек-номер", "Комментарий",
      ];
      const headerRow: CellObject[] = headers.map((value) => ({
        value,
        type: String,
        fontWeight: "bold",
        textColor: "#FFFFFF",
        backgroundColor: "#E8845A",
        align: "center",
        alignVertical: "center",
        wrap: true,
        height: 30,
        bottomBorderColor: "#D4703F",
        bottomBorderStyle: "thin",
      }));
      const textCell = (value: string, shaded: boolean): CellObject => ({
        value,
        type: String,
        format: "@",
        wrap: true,
        alignVertical: "top",
        ...(shaded ? { backgroundColor: "#FFF8F4" } : {}),
      });
      const numberCell = (value: number, shaded: boolean): CellObject => ({
        value,
        type: Number,
        format: '#,##0.00" ₽"',
        align: "right",
        alignVertical: "top",
        ...(shaded ? { backgroundColor: "#FFF8F4" } : {}),
      });
      const rows: SheetData = orders.map((order, index) => {
        const shaded = index % 2 === 1;
        return [
          textCell(order.id, shaded),
          { value: new Date(order.date), type: Date, format: "dd.mm.yyyy hh:mm", alignVertical: "top", ...(shaded ? { backgroundColor: "#FFF8F4" } : {}) },
          textCell(order.userName ?? "", shaded),
          textCell(order.userEmail ?? "", shaded),
          textCell(order.userPhone ?? "", shaded),
          textCell(STATUS_LABELS[order.status], shaded),
          textCell(paymentStatusInfo(order.paymentStatus).label, shaded),
          textCell(order.deliveryMethod, shaded),
          textCell(order.deliveryAddress, shaded),
          textCell(order.items.map((item) => `${item.name} × ${item.quantity}`).join("; "), shaded),
          numberCell(order.subtotal, shaded),
          numberCell(order.discount, shaded),
          numberCell(order.deliveryCost, shaded),
          numberCell(order.total, shaded),
          textCell(order.promoCode ?? "", shaded),
          textCell(order.paymentMethod, shaded),
          textCell(order.trackNumber ?? "", shaded),
          textCell(order.comment ?? "", shaded),
        ];
      });
      const sheetData: SheetData = [headerRow, ...rows];
      const output = writeXlsxFile(sheetData, {
        sheet: "Заказы",
        stickyRowsCount: 1,
        showGridLines: false,
        columns: [28, 20, 24, 30, 20, 22, 22, 22, 42, 48, 15, 15, 15, 15, 18, 24, 24, 36]
          .map((width) => ({ width })),
      }, { fontFamily: "Arial", fontSize: 10 });
      await output.toFile(`заказы_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch {
      setOrdersError("Не удалось сформировать Excel-файл. Обновите страницу и попробуйте ещё раз.");
    } finally {
      setExcelExporting(false);
    }
  };

  const selectedCustomer = selectedCustomerId !== null
    ? customerStats.find((c) => c.id === selectedCustomerId)
    : null;

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#fdf8f5] flex items-center justify-center">
        <p className="text-[#aaa] text-sm">Загрузка...</p>
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-[#fdf8f5] flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl border border-[#f0e8e0] p-10 w-full max-w-sm shadow-xl">
          <div className="w-14 h-14 rounded-full bg-[#E8845A] flex items-center justify-center mx-auto mb-6">
            <span className="text-white font-black text-xl">В</span>
          </div>
          <h1 className="text-2xl font-bold text-center mb-1">Админ-панель</h1>
          <p className="text-sm text-[#aaa] text-center mb-8">взБАДрись</p>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Пароль"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setPwError(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") doLogin(); }}
              className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors ${
                pwError ? "border-red-300 bg-red-50" : "border-[#f0e8e0] focus:border-[#E8845A]"
              }`}
            />
            {pwError && <p className="text-xs text-red-400">Неверный пароль</p>}
            <button
              onClick={doLogin}
              disabled={loggingIn}
              className="w-full bg-[#E8845A] hover:bg-[#d4703f] disabled:opacity-60 text-white font-bold py-3 rounded-full transition-all"
            >
              {loggingIn ? "Проверяем…" : "Войти"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcfb]">
      {/* Шапка */}
      <div className="bg-white border-b border-[#f0e8e0] px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#E8845A] flex items-center justify-center">
            <span className="text-white font-black text-sm">В</span>
          </div>
          <div>
            <p className="font-bold leading-tight">взБАДрись</p>
            <p className="text-xs text-[#aaa]">Панель управления</p>
          </div>
        </div>
        <button onClick={() => { void fetch("/api/admin/login", { method: "DELETE" }); setAuthed(false); setPw(""); setAdminPassword(null); }} className="text-xs text-[#aaa] hover:text-[#E8845A]">Выйти</button>
      </div>

      <div className={`${tab === "shipments" || tab === "inventory" || tab === "finance" ? "max-w-[1920px] px-3 sm:px-4 lg:px-5" : "max-w-7xl px-4 sm:px-6 lg:px-8"} mx-auto py-8`}>
        {/* Табы */}
        <div className="flex gap-1.5 sm:gap-2 mb-6 sm:mb-8 bg-[#f5f0ec] p-1.5 rounded-2xl w-full overflow-x-auto">
          {(["dashboard", "orders", "shipments", "inventory", "finance", "customers", "feedback", "promos", "products", "emails", "integrations"] as const).map((id) => {
            const labels: Record<typeof id, string> = { dashboard: "Дашборд", orders: "Заказы", shipments: "Отгрузки", inventory: "Склад", finance: "Финансы", customers: "Покупатели", feedback: "Отзывы и вопросы", promos: "Промокоды", products: "Товары", emails: "Письма", integrations: "Интеграции" };
            const icons: Record<typeof id, React.ReactNode> = {
              dashboard: <BarChart2 size={15} />,
              orders: <ShoppingBag size={15} />,
              shipments: <Package size={15} />,
              inventory: <Package size={15} />,
              finance: <TrendingUp size={15} />,
              customers: <Users size={15} />,
              feedback: <MessageCircle size={15} />,
              promos: <Tag size={15} />,
              products: <Package size={15} />,
              emails: <Mail size={15} />,
              integrations: <Link2 size={15} />,
            };
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  tab === id ? "bg-white shadow text-[#1a1a1a]" : "text-[#6b6b6b] hover:text-[#1a1a1a]"
                }`}
              >
                {icons[id]} {labels[id]}
                {id === "orders" && orders.length > 0 && (
                  <span className="bg-[#E8845A] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {orders.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ДАШБОРД */}
        {tab === "dashboard" && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
              {[
                { label: "Выручка", value: `${totalRevenue.toLocaleString("ru-RU")} ₽`, Icon: TrendingUp, color: "text-[#E8845A]" },
                { label: "Заказов всего", value: orders.length, Icon: ShoppingBag, color: "text-blue-500" },
                { label: "Оплаченных заказов", value: paidOrders.length, Icon: Check, color: "text-green-600" },
                { label: "Покупателей", value: activeCustomers, Icon: Users, color: "text-purple-500" },
                { label: "Средний чек", value: `${avgCheck.toLocaleString("ru-RU")} ₽`, Icon: BarChart2, color: "text-green-500" },
              ].map((m, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#f0e8e0] p-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-[#aaa]">{m.label}</p>
                    <m.Icon size={18} className={m.color} />
                  </div>
                  <p className="text-2xl font-bold">{m.value}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
              <h2 className="font-bold mb-5">Заказы по статусам</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
                {[
                  {
                    key: "awaiting",
                    label: "Ожидает оплаты",
                    color: "bg-yellow-100 text-yellow-700",
                    count: orders.filter((o) => ["creating", "awaiting_payment", "authorized", "processing_payment"].includes(o.paymentStatus ?? "")).length,
                  },
                  {
                    key: "paid",
                    label: "Оплаченные",
                    color: "bg-green-100 text-green-700",
                    count: paidOrders.length,
                  },
                  {
                    key: "confirmed",
                    label: STATUS_LABELS.confirmed,
                    color: STATUS_COLORS.confirmed,
                    count: orders.filter((o) => o.paymentStatus === "paid" && o.status === "confirmed").length,
                  },
                  {
                    key: "shipped",
                    label: STATUS_LABELS.shipped,
                    color: STATUS_COLORS.shipped,
                    count: orders.filter((o) => o.paymentStatus === "paid" && o.status === "shipped").length,
                  },
                  {
                    key: "ready_for_pickup",
                    label: STATUS_LABELS.ready_for_pickup,
                    color: STATUS_COLORS.ready_for_pickup,
                    count: orders.filter((o) => o.paymentStatus === "paid" && o.status === "ready_for_pickup").length,
                  },
                  {
                    key: "delivered",
                    label: STATUS_LABELS.delivered,
                    color: STATUS_COLORS.delivered,
                    count: orders.filter((o) => o.paymentStatus === "paid" && o.status === "delivered").length,
                  },
                  {
                    key: "cancelled",
                    label: STATUS_LABELS.cancelled,
                    color: STATUS_COLORS.cancelled,
                    count: orders.filter((o) => o.status === "cancelled" || ["payment_failed", "creation_failed", "payment_processing_error"].includes(o.paymentStatus ?? "")).length,
                  },
                ].map((item) => (
                  <div key={item.key} className="text-center p-4 rounded-2xl bg-[#fdf8f5]">
                    <p className="text-2xl font-bold mb-1">{item.count}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.color}`}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <SalesDynamicsChart orders={orders} />

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                <h2 className="font-bold mb-5">Топ покупателей</h2>
                {customerStats.filter((c) => c.ordersCount > 0).length === 0 ? (
                  <p className="text-sm text-[#aaa]">Заказов пока нет</p>
                ) : (
                  <div className="space-y-2">
                    {[...customerStats]
                      .filter((c) => c.ordersCount > 0)
                      .sort((a, b) => b.totalSpent - a.totalSpent)
                      .slice(0, 8)
                      .map((c, i) => (
                        <div key={c.id} className="flex items-center gap-3 py-2 border-b border-[#f0e8e0] last:border-0">
                          <span className="w-5 text-xs text-[#aaa] font-bold">{i + 1}</span>
                          <div className="w-7 h-7 rounded-full bg-[#FDDCCA] flex items-center justify-center text-xs font-bold text-[#8b4513] flex-shrink-0">
                            {c.name.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold truncate">{c.name}</p>
                            <p className="text-xs text-[#aaa] truncate">{c.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-[#E8845A]">{c.totalSpent.toLocaleString("ru-RU")} ₽</p>
                            <p className="text-xs text-[#aaa]">{c.ordersCount} зак.</p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                <h2 className="font-bold mb-5">Последние заказы</h2>
                {orders.length === 0 ? (
                  <p className="text-sm text-[#aaa]">Заказов пока нет</p>
                ) : (
                  <div className="space-y-2">
                    {[...orders]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .slice(0, 8)
                      .map((o) => (
                        <div key={o.id} className="flex items-center gap-3 py-2 border-b border-[#f0e8e0] last:border-0">
                          <Package size={14} className="text-[#E8845A] flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold font-mono">{o.id}</p>
                            <p className="text-xs text-[#aaa]">{o.userName ?? "—"} · {new Date(o.date).toLocaleDateString("ru-RU")}</p>
                          </div>
                          <div className="flex flex-wrap justify-end gap-1.5 flex-shrink-0">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>
                              {STATUS_LABELS[o.status]}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${paymentStatusInfo(o.paymentStatus).color}`}>
                              Оплата: {paymentStatusInfo(o.paymentStatus).label}
                            </span>
                          </div>
                          <p className="text-sm font-bold flex-shrink-0">{o.total.toLocaleString("ru-RU")} ₽</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ЗАКАЗЫ */}
        {tab === "orders" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aaa]" />
                <input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Поиск по номеру, имени, email..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] bg-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void syncPaymentStatuses()}
                  disabled={ordersLoading}
                  className="text-sm font-semibold px-4 py-2.5 rounded-full border border-[#f0e8e0] bg-white hover:border-[#E8845A] disabled:opacity-50"
                >
                  {ordersLoading ? "Обновляем..." : "Обновить"}
                </button>
                <button
                  onClick={exportOrders}
                  className="flex items-center gap-2 border border-[#E8845A] text-[#E8845A] bg-white text-sm font-semibold px-4 py-2.5 rounded-full hover:bg-[#fff7f3] transition-all"
                >
                  <Download size={15} /> Скачать CSV
                </button>
                <button
                  onClick={() => void exportOrdersExcel()}
                  disabled={excelExporting || !orders.length}
                  className="flex items-center gap-2 bg-[#E8845A] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#d4703f] transition-all disabled:opacity-50"
                >
                  <Download size={15} /> {excelExporting ? "Готовим Excel…" : "Скачать Excel"}
                </button>
              </div>
            </div>
            {ordersError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                Не удалось загрузить заказы: {ordersError}
              </div>
            )}
            {ordersSyncMessage && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {ordersSyncMessage}
              </div>
            )}

            <div className="bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#f0e8e0] bg-[#fdf8f5] text-xs font-semibold text-[#6b6b6b]">
                      <th className="text-left px-5 py-3">Заказ</th>
                      <th className="text-left px-5 py-3">
                        <button onClick={() => toggleOrderSort("date")} className="flex items-center hover:text-[#1a1a1a]">
                          Дата<SIcon f="date" cur={orderSortField} dir={orderSortDir} />
                        </button>
                      </th>
                      <th className="text-left px-5 py-3">
                        <button onClick={() => toggleOrderSort("userName")} className="flex items-center hover:text-[#1a1a1a]">
                          Покупатель<SIcon f="userName" cur={orderSortField} dir={orderSortDir} />
                        </button>
                      </th>
                      <th className="text-left px-5 py-3">
                        <button onClick={() => toggleOrderSort("status")} className="flex items-center hover:text-[#1a1a1a]">
                          Статус<SIcon f="status" cur={orderSortField} dir={orderSortDir} />
                        </button>
                      </th>
                      <th className="text-left px-5 py-3">Доставка</th>
                      <th className="text-left px-5 py-3">Оплата</th>
                      <th className="text-left px-5 py-3">
                        <button onClick={() => toggleOrderSort("total")} className="flex items-center hover:text-[#1a1a1a]">
                          Сумма<SIcon f="total" cur={orderSortField} dir={orderSortDir} />
                        </button>
                      </th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOrders.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-[#aaa] text-sm">Заказов нет</td></tr>
                    ) : sortedOrders.map((o) => (
                      <tr key={o.id} className="border-b border-[#f0e8e0] last:border-0 hover:bg-[#fdf8f5] transition-colors">
                        <td className="px-5 py-3 font-mono text-xs font-semibold text-[#E8845A]">{o.id}</td>
                        <td className="px-5 py-3 text-xs text-[#6b6b6b] whitespace-nowrap">{new Date(o.date).toLocaleDateString("ru-RU")}</td>
                        <td className="px-5 py-3">
                          <p className="font-semibold">{o.userName ?? "—"}</p>
                          <p className="text-xs text-[#aaa]">{o.userEmail ?? ""}</p>
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold text-[#6b6b6b] whitespace-nowrap">
                          {shortDeliveryMethod(o.deliveryMethod)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${paymentStatusInfo(o.paymentStatus).color}`}>
                            {paymentStatusInfo(o.paymentStatus).label}
                          </span>
                        </td>
                        <td className="px-5 py-3 font-bold whitespace-nowrap">{o.total.toLocaleString("ru-RU")} ₽</td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => openOrderDetails(o)}
                            className="flex items-center gap-1 text-xs text-[#E8845A] hover:underline font-semibold"
                          >
                            <Eye size={13} /> Открыть
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "shipments" && <ShipmentsWorkspace password={pw} />}

        {tab === "inventory" && <InventoryWorkspace password={pw} />}

        {tab === "finance" && <FinanceWorkspace password={pw} />}

        {/* ПОКУПАТЕЛИ */}
        {tab === "customers" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aaa]" />
                <input
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Поиск по имени, email, телефону..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] bg-white"
                />
              </div>
              <button
                onClick={exportCustomers}
                className="flex items-center gap-2 bg-[#E8845A] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#d4703f] transition-all"
              >
                <Download size={15} /> Скачать в Excel (CSV)
              </button>
            </div>

            <div className="bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#f0e8e0] bg-[#fdf8f5] text-xs font-semibold text-[#6b6b6b]">
                      {(
                        [
                          ["name", "Покупатель"],
                          ["email", "Email"],
                          ["createdAt", "Регистрация"],
                          ["ordersCount", "Заказов"],
                          ["totalSpent", "Сумма"],
                          ["avgCheck", "Ср. чек"],
                          ["lastOrder", "Посл. заказ"],
                        ] as [SortField, string][]
                      ).map(([field, label]) => (
                        <th key={field} className="text-left px-5 py-3">
                          <button onClick={() => toggleSort(field)} className="flex items-center hover:text-[#1a1a1a]">
                            {label}<SIcon f={field} cur={sortField} dir={sortDir} />
                          </button>
                        </th>
                      ))}
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCustomers.length === 0 ? (
                      <tr><td colSpan={8} className="text-center py-12 text-[#aaa] text-sm">Покупателей нет</td></tr>
                    ) : sortedCustomers.map((c) => (
                      <tr key={c.id} className="border-b border-[#f0e8e0] last:border-0 hover:bg-[#fdf8f5] transition-colors">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-[#FDDCCA] flex items-center justify-center text-xs font-bold text-[#8b4513] flex-shrink-0">
                              {c.name.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold">{c.name}</p>
                              <p className="text-xs text-[#aaa]">{c.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-xs text-[#6b6b6b]">{c.email}</td>
                        <td className="px-5 py-3 text-xs text-[#6b6b6b] whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString("ru-RU")}</td>
                        <td className="px-5 py-3 text-center font-bold">{c.ordersCount}</td>
                        <td className="px-5 py-3 font-bold text-[#E8845A] whitespace-nowrap">{c.totalSpent.toLocaleString("ru-RU")} ₽</td>
                        <td className="px-5 py-3 whitespace-nowrap">{c.avgCheck.toLocaleString("ru-RU")} ₽</td>
                        <td className="px-5 py-3 text-xs text-[#6b6b6b] whitespace-nowrap">
                          {c.lastOrder ? new Date(c.lastOrder).toLocaleDateString("ru-RU") : "—"}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => setSelectedCustomerId(c.id)}
                            className="flex items-center gap-1 text-xs text-[#E8845A] hover:underline font-semibold whitespace-nowrap"
                          >
                            <Eye size={13} /> Профиль
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ОТЗЫВЫ И ВОПРОСЫ */}
        {tab === "feedback" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-3 justify-between">
              <div>
                <h2 className="text-xl font-bold">Отзывы и вопросы</h2>
                <p className="text-sm text-[#6b6b6b] mt-1">Отвечайте покупателям здесь — ответ сразу появится на карточке соответствующего товара.</p>
              </div>
              <button onClick={() => void loadFeedback()} disabled={feedbackLoading} className="inline-flex items-center gap-2 border border-[#f0e8e0] bg-white hover:border-[#E8845A] disabled:opacity-60 text-sm font-semibold px-4 py-2.5 rounded-full"><RefreshCw size={15} className={feedbackLoading ? "animate-spin" : ""} /> Обновить</button>
            </div>
            {feedbackError && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{feedbackError}</div>}
            <div className="grid xl:grid-cols-2 gap-6">
              <section className="bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#f0e8e0] flex items-center justify-between"><div><h3 className="font-bold">Отзывы</h3><p className="text-xs text-[#aaa] mt-1">Их оставляют только покупатели из личного кабинета.</p></div><span className="text-xs font-bold bg-[#fff1e9] text-[#E8845A] px-2.5 py-1 rounded-full">{feedbackReviews.length}</span></div>
                {feedbackLoading ? <p className="p-6 text-sm text-[#aaa]">Загружаем…</p> : feedbackReviews.length === 0 ? <p className="p-6 text-sm text-[#aaa]">Отзывов пока нет.</p> : <div className="divide-y divide-[#f0e8e0]">{feedbackReviews.map((item) => {
                  const history = feedbackResponses.filter((response) => response.feedback_type === "review" && response.feedback_id === item.id);
                  return <article key={item.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-sm">{item.author_name}</p><p className="text-xs text-[#aaa] mt-0.5">{item.author_email || "E-mail не указан"} · {new Date(item.created_at).toLocaleDateString("ru-RU")}</p></div>{item.rating && <span className="text-xs font-bold text-[#E8845A]">★ {item.rating}/5</span>}</div><p className="mt-3 text-sm leading-relaxed">{item.body}</p>{item.image_url && <a href={item.image_url} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-[#E8845A] hover:underline">Открыть фото</a>}{history.length > 0 && <div className="mt-4 rounded-xl bg-[#fdf8f5] p-3"><p className="text-xs font-bold text-[#8b6b5d]">История ответов</p>{history.map((response) => <div key={response.id} className="mt-2 border-t border-[#f0e8e0] pt-2"><p className="text-sm">{response.body}</p><p className="mt-1 text-xs text-[#aaa]">{new Date(response.created_at).toLocaleString("ru-RU")}</p></div>)}</div>}<textarea value={feedbackDrafts[`review:${item.id}`] ?? ""} onChange={(event) => setFeedbackDrafts((drafts) => ({ ...drafts, [`review:${item.id}`]: event.target.value }))} rows={3} placeholder={item.answer ? "Напишите новый ответ — предыдущий останется в истории" : "Поблагодарите или ответьте покупателю"} className="mt-4 w-full rounded-xl border border-[#f0e8e0] px-3 py-2.5 text-sm outline-none focus:border-[#E8845A]" /><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void saveFeedback("review", item)} disabled={feedbackSaving === `review:${item.id}`} className="px-4 py-2 rounded-xl bg-[#E8845A] text-white text-xs font-semibold disabled:opacity-60">{feedbackSaving === `review:${item.id}` ? "Сохраняем…" : item.answer ? "Добавить ответ" : "Опубликовать ответ"}</button><button onClick={() => void saveFeedback("review", item, !item.is_published)} disabled={feedbackSaving === `review:${item.id}`} className="px-4 py-2 rounded-xl border border-[#f0e8e0] text-xs font-semibold">{item.is_published ? "Скрыть отзыв" : "Показать отзыв"}</button><button onClick={() => void deleteFeedback("review", item)} disabled={feedbackSaving === `review:${item.id}`} className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold">Удалить отзыв</button></div></article>;
                })}</div>}
              </section>
              <section className="bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#f0e8e0] flex items-center justify-between"><div><h3 className="font-bold">Вопросы</h3><p className="text-xs text-[#aaa] mt-1">Новый вопрос появится на сайте вместе с ответом.</p></div><span className="text-xs font-bold bg-[#fff1e9] text-[#E8845A] px-2.5 py-1 rounded-full">{feedbackQuestions.length}</span></div>
                {feedbackLoading ? <p className="p-6 text-sm text-[#aaa]">Загружаем…</p> : feedbackQuestions.length === 0 ? <p className="p-6 text-sm text-[#aaa]">Вопросов пока нет.</p> : <div className="divide-y divide-[#f0e8e0]">{feedbackQuestions.map((item) => {
                  const history = feedbackResponses.filter((response) => response.feedback_type === "question" && response.feedback_id === item.id);
                  return <article key={item.id} className="p-5"><div><p className="font-semibold text-sm">{item.author_name}</p><p className="text-xs text-[#aaa] mt-0.5">{item.author_email || "E-mail не указан"} · {new Date(item.created_at).toLocaleDateString("ru-RU")}</p></div><p className="mt-3 text-sm leading-relaxed">{item.body}</p>{history.length > 0 && <div className="mt-4 rounded-xl bg-[#fdf8f5] p-3"><p className="text-xs font-bold text-[#8b6b5d]">История ответов</p>{history.map((response) => <div key={response.id} className="mt-2 border-t border-[#f0e8e0] pt-2"><p className="text-sm">{response.body}</p><p className="mt-1 text-xs text-[#aaa]">{new Date(response.created_at).toLocaleString("ru-RU")}</p></div>)}</div>}<textarea value={feedbackDrafts[`question:${item.id}`] ?? ""} onChange={(event) => setFeedbackDrafts((drafts) => ({ ...drafts, [`question:${item.id}`]: event.target.value }))} rows={3} placeholder={item.answer ? "Напишите новый ответ — предыдущий останется в истории" : "Напишите понятный ответ покупателю"} className="mt-4 w-full rounded-xl border border-[#f0e8e0] px-3 py-2.5 text-sm outline-none focus:border-[#E8845A]" /><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => void saveFeedback("question", item)} disabled={feedbackSaving === `question:${item.id}`} className="px-4 py-2 rounded-xl bg-[#E8845A] text-white text-xs font-semibold disabled:opacity-60">{feedbackSaving === `question:${item.id}` ? "Сохраняем…" : item.answer ? "Добавить ответ" : "Ответить и опубликовать"}</button><button onClick={() => void saveFeedback("question", item, !item.is_published)} disabled={feedbackSaving === `question:${item.id}`} className="px-4 py-2 rounded-xl border border-[#f0e8e0] text-xs font-semibold">{item.is_published ? "Скрыть с сайта" : "Опубликовать без ответа"}</button><button onClick={() => void deleteFeedback("question", item)} disabled={feedbackSaving === `question:${item.id}`} className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-semibold">Удалить вопрос</button></div></article>;
                })}</div>}
              </section>
            </div>
          </div>
        )}

        {/* ПРОМОКОДЫ */}
        {tab === "promos" && (
          <div className="space-y-6">
            {/* Форма добавления */}
            <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
              <h2 className="font-bold mb-5 flex items-center gap-2"><Tag size={16} className="text-[#E8845A]" /> Создать промокод</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_10rem_auto] gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Промокод</label>
                  <input
                    value={newPromoCode}
                    onChange={(e) => { setNewPromoCode(e.target.value.toUpperCase()); setPromoFormError(""); }}
                    placeholder="например: ЛЕТО20"
                    className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Владелец кода</label>
                  <input
                    value={newPromoOwner}
                    onChange={(e) => setNewPromoOwner(e.target.value)}
                    placeholder="например: Марина / блогер"
                    className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                  />
                </div>
                <div className="w-full sm:w-40">
                  <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Скидка %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newPromoDiscount}
                    onChange={(e) => { setNewPromoDiscount(e.target.value); setPromoFormError(""); }}
                    placeholder="10"
                    className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={async () => {
                      if (promoHasExpiry && !newPromoExpiry) {
                        setPromoFormError("Укажите дату окончания");
                        return;
                      }
                      const response = await fetch("/api/admin/promos", { method: "POST", headers: { "content-type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ code: newPromoCode, ownerName: newPromoOwner, discountPercent: Number(newPromoDiscount), expiresAt: promoHasExpiry ? newPromoExpiry : undefined }) });
                      const data = await response.json().catch(() => ({}));
                      if (response.ok) {
                        setNewPromoCode("");
                        setNewPromoOwner("");
                        setNewPromoDiscount("");
                        setNewPromoExpiry("");
                        setPromoHasExpiry(false);
                        setPromoFormError("");
                        setPromoAdded(true);
                        setTimeout(() => setPromoAdded(false), 2000);
                        await loadPromos();
                        await loadLoyaltyStats();
                      } else {
                        setPromoFormError(data.error ?? "Ошибка");
                      }
                    }}
                    className="w-full sm:w-auto flex items-center gap-2 bg-[#E8845A] hover:bg-[#d4703f] text-white font-semibold px-6 py-3 rounded-2xl transition-all whitespace-nowrap"
                  >
                    {promoAdded ? <><Check size={15} /> Добавлен</> : <>+ Добавить</>}
                  </button>
                </div>
              </div>
              {/* Срок действия */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <button
                    type="button"
                    onClick={() => { setPromoHasExpiry(!promoHasExpiry); setNewPromoExpiry(""); setPromoFormError(""); }}
                    className="flex-shrink-0"
                  >
                    {promoHasExpiry
                      ? <ToggleRight size={26} className="text-[#E8845A]" />
                      : <ToggleLeft size={26} className="text-[#ccc]" />}
                  </button>
                  <span className="text-sm font-medium text-[#6b6b6b]">Ограниченный срок действия</span>
                </label>
                {promoHasExpiry && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[#6b6b6b]">Действует до:</span>
                    <input
                      type="date"
                      value={newPromoExpiry}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => { setNewPromoExpiry(e.target.value); setPromoFormError(""); }}
                      className="px-3 py-2 rounded-xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                    />
                  </div>
                )}
              </div>
              {promoFormError && <p className="text-xs text-red-400 mt-2">{promoFormError}</p>}
              <p className="text-xs text-[#aaa] mt-3">Промокод автоматически становится активным и сразу начинает работать в корзине. Владелец необязателен, но поможет видеть результат блогера или партнёра.</p>
            </div>

            {/* Список промокодов */}
            <div className="bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#f0e8e0] flex items-center justify-between">
                <h2 className="font-bold">Все промокоды</h2>
                <div className="flex items-center gap-3">
                  {promoLoading && <span className="text-xs text-[#aaa]">Обновляем…</span>}
                  <button onClick={() => { void loadPromos(); void loadLoyaltyStats(); }} className="text-xs font-semibold text-[#E8845A] hover:underline">Обновить</button>
                  <span className="text-xs text-[#aaa]">{promos.length} шт.</span>
                </div>
              </div>
              {promoLoadError && <div className="mx-6 mt-4 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">Не удалось загрузить промокоды: {promoLoadError}</div>}
              {promos.length === 0 ? (
                <div className="py-12 text-center text-[#aaa] text-sm">Промокодов нет — создайте первый</div>
              ) : (
                <div className="divide-y divide-[#f0e8e0]">
                  {promos.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                      {/* Статус */}
                      <button onClick={async () => { const response = await fetch("/api/admin/promos", { method: "PATCH", headers: { "content-type": "application/json", "x-admin-password": pw }, body: JSON.stringify({ id: p.id, active: !p.active }) }); if (response.ok) void loadPromos(); }} className="flex-shrink-0">
                        {p.active
                          ? <ToggleRight size={28} className="text-[#E8845A]" />
                          : <ToggleLeft size={28} className="text-[#ccc]" />}
                      </button>
                      {/* Код */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={`font-mono font-bold text-base ${p.active ? "text-[#1a1a1a]" : "text-[#aaa] line-through"}`}>
                            {p.code}
                          </span>
                          {p.expiresAt && new Date(p.expiresAt) < new Date() ? (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-500">Истёк</span>
                          ) : (
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${p.active ? "bg-green-100 text-green-700" : "bg-[#f0e8e0] text-[#aaa]"}`}>
                              {p.active ? "Активен" : "Отключён"}
                            </span>
                          )}
                          {p.expiresAt && new Date(p.expiresAt) >= new Date() && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-[#fff3e8] text-[#E8845A] font-medium">
                              до {new Date(p.expiresAt).toLocaleDateString("ru-RU")}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-[#6b6b6b] mt-0.5">
                          Создан {new Date(p.createdAt).toLocaleDateString("ru-RU")} · Использований: {p.usageCount}
                          {p.expiresAt && (
                            <span className={new Date(p.expiresAt) < new Date() ? "text-red-400 ml-2 font-semibold" : "ml-2"}>
                              · {new Date(p.expiresAt) < new Date() ? "Истёк" : "До"} {new Date(p.expiresAt).toLocaleDateString("ru-RU")}
                            </span>
                          )}
                          {!p.expiresAt && <span className="ml-2 text-[#aaa]">· Бессрочный</span>}
                        </p>
                        {p.ownerName && <p className="text-xs text-[#E8845A] mt-1">Владелец: {p.ownerName}</p>}
                      </div>
                      {/* Скидка */}
                      <div className="text-center flex-shrink-0 w-16">
                        <p className="text-2xl font-black text-[#E8845A]">{p.discount}%</p>
                        <p className="text-xs text-[#aaa]">скидка</p>
                      </div>
                      {/* Удалить */}
                      <button
                        onClick={async () => { if (confirm(`Удалить промокод ${p.code}?`)) { const response = await fetch(`/api/admin/promos?id=${encodeURIComponent(p.id)}`, { method: "DELETE", headers: { "x-admin-password": pw } }); if (response.ok) void loadPromos(); } }}
                        className="flex-shrink-0 p-2 rounded-xl hover:bg-red-50 text-[#ccc] hover:text-red-400 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid xl:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#f0e8e0]">
                  <h2 className="font-bold">Результаты промокодов</h2>
                  <p className="text-xs text-[#aaa] mt-1">Только оплаченные заказы</p>
                </div>
                {loyaltyStatsError ? <p className="p-6 text-sm text-red-500">{loyaltyStatsError}</p> : !loyaltyStats ? <p className="p-6 text-sm text-[#aaa]">Загружаем статистику…</p> : loyaltyStats.promos.length === 0 ? <p className="p-6 text-sm text-[#aaa]">Пока нет созданных промокодов</p> : (
                  <div className="divide-y divide-[#f5eee8]">
                    {loyaltyStats.promos.map((promo) => (
                      <div key={promo.code} className="px-6 py-4 flex items-center gap-4">
                        <div className="min-w-0 flex-1"><p className="font-mono font-bold">{promo.code}</p><p className="text-xs text-[#6b6b6b] mt-1">{promo.ownerName ? `Владелец: ${promo.ownerName}` : "Без указанного владельца"} · скидка {promo.discountPercent}%</p></div>
                        <div className="text-right shrink-0"><p className="font-bold">{promo.paidOrders} заказ{promo.paidOrders === 1 ? "" : promo.paidOrders < 5 ? "а" : "ов"}</p><p className="text-xs text-[#aaa]">{Math.round(promo.revenue).toLocaleString("ru-RU")} ₽</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#f0e8e0]">
                  <h2 className="font-bold">Реферальные коды покупателей</h2>
                  <p className="text-xs text-[#aaa] mt-1">Кого можно поощрить за приведённых покупателей</p>
                </div>
                {loyaltyStatsError ? <p className="p-6 text-sm text-red-500">{loyaltyStatsError}</p> : !loyaltyStats ? <p className="p-6 text-sm text-[#aaa]">Загружаем статистику…</p> : loyaltyStats.referrals.length === 0 ? <p className="p-6 text-sm text-[#aaa]">Оплаченных реферальных заказов пока нет</p> : (
                  <div className="divide-y divide-[#f5eee8]">
                    {loyaltyStats.referrals.map((referral) => (
                      <div key={referral.ownerId} className="px-6 py-4 flex items-center gap-4">
                        <div className="min-w-0 flex-1"><p className="font-semibold truncate">{referral.ownerName}</p><p className="text-xs text-[#6b6b6b] mt-1 font-mono">{referral.code} · скидка {referral.discountPercent}%</p><p className="text-xs text-[#aaa] truncate">{referral.ownerEmail}</p></div>
                        <div className="text-right shrink-0"><p className="font-bold">{referral.paidOrders} заказ{referral.paidOrders === 1 ? "" : referral.paidOrders < 5 ? "а" : "ов"}</p><p className="text-xs text-[#aaa]">{Math.round(referral.revenue).toLocaleString("ru-RU")} ₽</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Подсказка */}
            <div className="bg-[#fdf8f5] rounded-2xl border border-[#f0e8e0] p-5 text-sm text-[#6b6b6b] space-y-1.5">
              <p className="font-semibold text-[#1a1a1a] mb-2">Как работают промокоды</p>
              <p>· Активные промокоды сразу работают в корзине — покупатель вводит код и получает скидку</p>
              <p>· Отключённый промокод перестаёт работать мгновенно, код никуда не исчезает</p>
              <p>· Реферальные коды покупателей (из личного кабинета) дают фиксированную скидку 5%</p>
              <p>· Один промокод можно совмещать с одним реферальным кодом — скидки суммируются</p>
            </div>
          </div>
        )}

        {/* ИНТЕГРАЦИИ */}
        {tab === "integrations" && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6 sm:p-8">
              <div className="w-11 h-11 rounded-2xl bg-[#fff3ec] text-[#E8845A] flex items-center justify-center mb-5"><Package size={21} /></div>
              <h2 className="text-xl font-bold">Способы доставки</h2>
              <p className="text-sm text-[#6b6b6b] mt-2 leading-relaxed">Включайте только доступные покупателям способы. Выключенный способ сразу исчезнет при оформлении заказа, но сохранится в старых заказах.</p>
              <div className="mt-6 space-y-3">
                {[
                  ["pickup", "Самовывоз — Казань", "Бесплатно"],
                  ["sdek_pvz", "СДЭК — пункт выдачи", "Фиксированная цена"],
                  ["yandex_pvz", "Яндекс — пункт выдачи", "Фиксированная цена"],
                  ["ozon_pvz", "Ozon — пункт выдачи", "Фиксированная цена"],
                  ["pochta", "Почта России", "По тарифу выбранного отделения"],
                ].map(([id, name, note]) => {
                  const method = id as keyof DeliverySettings["enabled"];
                  return (
                    <label key={id} className="flex items-center justify-between gap-4 rounded-2xl border border-[#f0e8e0] px-4 py-3 cursor-pointer">
                      <span><span className="block font-semibold text-sm">{name}</span><span className="block text-xs text-[#aaa] mt-0.5">{note}</span></span>
                      <input type="checkbox" checked={deliverySettings.enabled[method]} onChange={(event) => setDeliverySettings((current) => ({ ...current, enabled: { ...current.enabled, [method]: event.target.checked } }))} className="h-5 w-5 accent-[#E8845A]" />
                    </label>
                  );
                })}
              </div>
              <div className="mt-6 pt-6 border-t border-[#f0e8e0]">
                <label className="block text-sm font-semibold mb-1.5">ID виджета Почты России</label>
                <p className="text-xs text-[#6b6b6b] mb-3">Только число из кабинета EKOM. Скрипт или ключи сюда вводить не нужно.</p>
                <input type="number" min="1" value={deliverySettings.pochtaWidgetId} onChange={(event) => setDeliverySettings((current) => ({ ...current, pochtaWidgetId: Number(event.target.value) }))} className="w-full max-w-xs px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]" />
              </div>
              {deliverySettingsMessage && <p className={`mt-4 text-sm ${deliverySettingsMessage.includes("сохранены") ? "text-green-700" : "text-red-500"}`}>{deliverySettingsMessage}</p>}
              <button disabled={deliverySettingsLoading} onClick={() => void saveDeliverySettings()} className="mt-5 inline-flex items-center gap-2 bg-[#E8845A] hover:bg-[#d4703f] disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-2xl transition-colors">
                <Check size={16} /> {deliverySettingsLoading ? "Сохраняем…" : "Сохранить настройки"}
              </button>
              <p className="mt-4 text-xs text-[#aaa]">Для новой службы доставки не вставляйте произвольный код виджета: пришлите нам её документацию — безопасно подключим и добавим отдельный переключатель.</p>
            </div>
            <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6 sm:p-8">
              <div className="w-11 h-11 rounded-2xl bg-[#eef5ff] text-[#2767d8] flex items-center justify-center mb-5"><Link2 size={21} /></div>
              <h2 className="text-xl font-bold">Ozon Доставка</h2>
              <p className="text-sm text-[#6b6b6b] mt-3 leading-relaxed">Подключите созданное частное приложение Ozon. После подтверждения сайт сможет получать реальные пункты выдачи и создавать отправления только после оплаты заказа.</p>
              <div className="mt-6 rounded-2xl bg-[#fdf8f5] border border-[#f0e8e0] p-4 text-sm text-[#6b6b6b]">
                <p className="font-semibold text-[#1a1a1a] mb-1">Перед подключением</p>
                <p>Защищённый сервер доставки должен быть настроен и иметь постоянный IP-адрес. Данные Ozon не хранятся в коде сайта.</p>
              </div>
              {ozonConnectError && <p className="mt-4 text-sm text-red-500">{ozonConnectError}</p>}
              {ozonStatusMessage && <p className={`mt-4 text-sm ${ozonStatusMessage.includes("подтверждён") ? "text-green-700" : ozonStatusMessage.includes("подключён") ? "text-amber-700" : "text-red-500"}`}>{ozonStatusMessage}</p>}
              <button
                disabled={ozonConnecting}
                onClick={async () => {
                  setOzonConnecting(true); setOzonConnectError("");
                  try {
                    const response = await fetch("/api/admin/ozon-delivery/oauth/start", { method: "POST", headers: { "x-admin-password": pw }, cache: "no-store" });
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok || typeof payload.authorizeUrl !== "string") throw new Error(payload.error || "Не удалось начать подключение");
                    window.location.assign(payload.authorizeUrl);
                  } catch (error) {
                    setOzonConnectError(error instanceof Error ? error.message : "Не удалось начать подключение");
                    setOzonConnecting(false);
                  }
                }}
                className="mt-6 inline-flex items-center gap-2 bg-[#2767d8] hover:bg-[#1e56b9] disabled:opacity-60 text-white font-semibold px-6 py-3 rounded-2xl transition-colors"
              >
                <Link2 size={16} /> {ozonConnecting ? "Открываем Ozon…" : "Подключить Ozon Доставку"}
              </button>
              <button
                disabled={ozonStatusLoading}
                onClick={async () => {
                  setOzonStatusLoading(true); setOzonStatusMessage("");
                  try {
                    const response = await fetch("/api/admin/ozon-delivery/status", { headers: { "x-admin-password": pw }, cache: "no-store" });
                    const payload = await response.json().catch(() => ({}));
                    if (!response.ok || !payload.connected) throw new Error(payload.error || "Ozon пока не подтвердил доступ к логистике");
                    if (payload.logisticsVerified) {
                      setOzonStatusMessage("Доступ к Ozon Logistics подтверждён. Можно переходить к выводу ПВЗ.");
                    } else {
                      setOzonStatusMessage(`OAuth-доступ к Ozon подключён. Отдельный метод логистики вернул HTTP ${payload.ozonStatus}; это не отменяет подключение, но его учтём при настройке ПВЗ.`);
                    }
                  } catch (error) {
                    setOzonStatusMessage(error instanceof Error ? error.message : "Не удалось проверить доступ к Ozon");
                  } finally {
                    setOzonStatusLoading(false);
                  }
                }}
                className="mt-3 ml-0 sm:ml-3 inline-flex items-center gap-2 border border-[#2767d8] text-[#2767d8] hover:bg-[#eef5ff] disabled:opacity-60 font-semibold px-6 py-3 rounded-2xl transition-colors"
              >
                <RefreshCw size={16} className={ozonStatusLoading ? "animate-spin" : ""} /> {ozonStatusLoading ? "Проверяем…" : "Проверить доступ"}
              </button>
            </div>
          </div>
        )}

        {/* ПИСЬМА И ТЕСТОВЫЙ КАБИНЕТ */}
        {tab === "emails" && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                <h2 className="font-bold flex items-center gap-2 mb-2">
                  <Send size={17} className="text-[#E8845A]" /> Тестовое письмо
                </h2>
                <p className="text-sm text-[#6b6b6b] mb-5">
                  Проверяет Resend, домен отправителя и фирменный шаблон.
                </p>
                <input
                  type="email"
                  value={testRecipient}
                  onChange={(event) => setTestRecipient(event.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] mb-3"
                  placeholder="email получателя"
                />
                <button
                  disabled={emailLoading}
                  onClick={async () => {
                    setEmailLoading(true);
                    setEmailMessage("");
                    try {
                      const response = await fetch("/api/admin/emails", {
                        method: "POST",
                        headers: {
                          "content-type": "application/json",
                          "x-admin-password": pw,
                        },
                        body: JSON.stringify({ email: testRecipient }),
                      });
                      const data = await response.json();
                      if (!response.ok) throw new Error(data.error || "Не удалось отправить");
                      setEmailMessage("Тестовое письмо отправлено.");
                      await loadEmailLogs();
                    } catch (error) {
                      setEmailMessage(error instanceof Error ? error.message : "Не удалось отправить");
                    } finally {
                      setEmailLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 bg-[#E8845A] text-white font-semibold px-5 py-3 rounded-2xl hover:bg-[#d4703f] disabled:opacity-50"
                >
                  <Send size={15} /> {emailLoading ? "Отправляем..." : "Отправить тест"}
                </button>
              </div>

              <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
                <h2 className="font-bold flex items-center gap-2 mb-2">
                  <UserPlus size={17} className="text-[#E8845A]" /> Тестовый покупатель
                </h2>
                <p className="text-sm text-[#6b6b6b] mb-5">
                  Создаёт настоящий аккаунт Supabase. Пароль показывается только здесь и не хранится в коде.
                </p>
                <button
                  onClick={async () => {
                    setEmailMessage("");
                    setTestCredentials(null);
                    try {
                      const response = await fetch("/api/admin/test-user", {
                        method: "POST",
                        headers: { "x-admin-password": pw },
                      });
                      const data = await response.json();
                      if (!response.ok) throw new Error(data.error || "Не удалось создать пользователя");
                      setTestCredentials(data.credentials);
                    } catch (error) {
                      setEmailMessage(error instanceof Error ? error.message : "Ошибка создания");
                    }
                  }}
                  className="inline-flex items-center gap-2 border border-[#E8845A] text-[#E8845A] font-semibold px-5 py-3 rounded-2xl hover:bg-[#fff7f2]"
                >
                  <UserPlus size={15} /> Создать тестовый аккаунт
                </button>
                {testCredentials && (
                  <div className="mt-4 rounded-2xl bg-[#fff7f2] border border-[#f5d5c0] p-4 text-sm">
                    <p><b>Логин:</b> <span className="font-mono break-all">{testCredentials.email}</span></p>
                    <p className="mt-2"><b>Пароль:</b> <span className="font-mono break-all">{testCredentials.password}</span></p>
                    <p className="text-xs text-[#8b6b5d] mt-3">Сохраните пароль сейчас: повторно он не показывается.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
              <h2 className="font-bold flex items-center gap-2 mb-2">
                <Mail size={17} className="text-[#E8845A]" /> Новое письмо покупателю
              </h2>
              <p className="text-sm text-[#6b6b6b] mb-5">
                Отправляет одно фирменное письмо выбранному человеку и сохраняет результат в журнале. Для рекламных рассылок используйте только список контактов с отдельным согласием ниже.
              </p>
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  type="email"
                  value={manualRecipient}
                  onChange={(event) => setManualRecipient(event.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                  placeholder="email получателя"
                />
                <input
                  value={manualSubject}
                  onChange={(event) => setManualSubject(event.target.value)}
                  maxLength={160}
                  className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                  placeholder="Тема письма"
                />
              </div>
              <textarea
                value={manualText}
                onChange={(event) => setManualText(event.target.value)}
                maxLength={6000}
                rows={7}
                className="mt-3 w-full resize-y px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                placeholder="Текст письма. Абзацы и переносы строк сохранятся в фирменном шаблоне."
              />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#8A817C]">{manualText.length}/6000 символов</p>
                <button
                  disabled={manualEmailLoading || !manualRecipient.trim() || !manualSubject.trim() || !manualText.trim()}
                  onClick={async () => {
                    setManualEmailLoading(true);
                    setEmailMessage("");
                    try {
                      const response = await fetch("/api/admin/emails", {
                        method: "POST",
                        headers: { "content-type": "application/json", "x-admin-password": pw },
                        body: JSON.stringify({
                          type: "manual",
                          email: manualRecipient,
                          subject: manualSubject,
                          message: manualText,
                        }),
                      });
                      const data = await response.json().catch(() => ({}));
                      if (!response.ok) throw new Error(data.error || "Не удалось отправить письмо");
                      setEmailMessage("Письмо отправлено и добавлено в журнал.");
                      setManualSubject("");
                      setManualText("");
                      await loadEmailLogs();
                    } catch (error) {
                      setEmailMessage(error instanceof Error ? error.message : "Не удалось отправить письмо");
                    } finally {
                      setManualEmailLoading(false);
                    }
                  }}
                  className="inline-flex items-center gap-2 bg-[#E8845A] text-white font-semibold px-5 py-3 rounded-2xl hover:bg-[#d4703f] disabled:opacity-50"
                >
                  <Send size={15} /> {manualEmailLoading ? "Отправляем..." : "Отправить письмо"}
                </button>
              </div>
            </div>

            {emailMessage && (
              <div className="rounded-2xl bg-[#fff7f2] border border-[#f5d5c0] px-5 py-3 text-sm text-[#8b4513]">
                {emailMessage}
              </div>
            )}

            <div className="bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#f0e8e0] flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-bold">Контакты для рекламной рассылки</h2>
                  <p className="text-xs text-[#6b6b6b] mt-1">Только пользователи, которые сами поставили необязательную галочку.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => exportCSV(marketingContacts.map((contact) => ({
                      "Email": contact.email,
                      "Имя": contact.name,
                      "Телефон": contact.phone,
                      "Дата согласия": new Date(contact.consentAt).toLocaleString("ru-RU"),
                      "Источник": contact.source === "registration" ? "Регистрация" : contact.source === "order" ? "Заказ" : "Регистрация и заказ",
                    })), "kontakty-dlya-rassylki.csv")}
                    disabled={!marketingContacts.length}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[#f0e8e0] text-xs font-semibold text-[#6b6b6b] hover:text-[#E8845A] disabled:opacity-40"
                  >
                    <Download size={14} /> CSV
                  </button>
                  <button
                    onClick={() => void loadMarketingContacts()}
                    className="p-2 rounded-xl border border-[#f0e8e0] text-[#6b6b6b] hover:text-[#E8845A]"
                    title="Обновить"
                  >
                    <RefreshCw size={16} className={marketingLoading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>
              {marketingError ? (
                <p className="m-5 rounded-xl bg-red-50 p-3 text-sm text-red-600">{marketingError}</p>
              ) : marketingContacts.length === 0 ? (
                <div className="py-10 text-center text-sm text-[#aaa]">
                  {marketingLoading ? "Загружаем список…" : "Согласий на рекламную рассылку пока нет"}
                </div>
              ) : (
                <div className="divide-y divide-[#f0e8e0]">
                  {marketingContacts.map((contact) => (
                    <div key={contact.email} className="flex flex-col gap-1 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{contact.name || "Покупатель"}</p>
                        <p className="text-xs text-[#6b6b6b]">{contact.email}{contact.phone ? ` · ${contact.phone}` : ""}</p>
                      </div>
                      <p className="text-xs text-[#8A817C]">Согласие: {new Date(contact.consentAt).toLocaleString("ru-RU")}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#f0e8e0] flex items-center justify-between">
                <div>
                  <h2 className="font-bold">Журнал писем</h2>
                  <p className="text-xs text-[#aaa] mt-1">Последние 100 попыток отправки</p>
                </div>
                <button
                  onClick={() => void loadEmailLogs()}
                  className="p-2 rounded-xl border border-[#f0e8e0] text-[#6b6b6b] hover:text-[#E8845A]"
                  title="Обновить"
                >
                  <RefreshCw size={16} className={emailLoading ? "animate-spin" : ""} />
                </button>
              </div>
              {emailLogs.length === 0 ? (
                <div className="py-12 text-center text-sm text-[#aaa]">Писем пока нет</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#fdf8f5] text-xs text-[#6b6b6b]">
                        <th className="text-left px-5 py-3">Дата</th>
                        <th className="text-left px-5 py-3">Получатель</th>
                        <th className="text-left px-5 py-3">Письмо</th>
                        <th className="text-left px-5 py-3">Заказ</th>
                        <th className="text-left px-5 py-3">Статус</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emailLogs.map((log) => (
                        <tr key={log.id} className="border-t border-[#f0e8e0]">
                          <td className="px-5 py-3 whitespace-nowrap text-xs text-[#6b6b6b]">
                            {new Date(log.created_at).toLocaleString("ru-RU")}
                          </td>
                          <td className="px-5 py-3">{log.recipient}</td>
                          <td className="px-5 py-3">
                            <p className="font-medium">{log.subject}</p>
                            {log.error && <p className="text-xs text-red-500 mt-1">{log.error}</p>}
                          </td>
                          <td className="px-5 py-3 font-mono text-xs">{log.order_id || "—"}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                              log.status === "sent" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                            }`}>
                              {log.status === "sent" ? "Отправлено" : "Ошибка"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ТОВАРЫ */}
        {tab === "products" && (
          <div className="space-y-6">
            {/* Шапка */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aaa]" />
                <input
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Поиск по названию..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] bg-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    setProductsSaving(true);
                    setProductsMessage("");
                    const result = await seedDatabase();
                    setProductsSaving(false);
                    setProductsMessage(result.ok ? "Все изменения сохранены в базе и уже попадут на сайт." : `Не удалось сохранить: ${result.error}`);
                  }}
                  disabled={productsSaving}
                  className="text-xs font-semibold text-white bg-[#E8845A] hover:bg-[#d4703f] disabled:bg-[#e8b6a0] px-3 py-2 rounded-xl"
                >
                  {productsSaving ? "Сохраняем…" : "Сохранить все изменения"}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm("Сбросить товары к исходным? Текущие правки будут потеряны.")) return;
                    setProductsSaving(true);
                    const result = await resetToDefault();
                    setProductsSaving(false);
                    setProductsMessage(result.ok ? "Исходные товары сохранены в базе." : `Не удалось сохранить: ${result.error}`);
                  }}
                  className="text-xs text-[#aaa] hover:text-[#E8845A] px-3 py-2 rounded-xl border border-[#f0e8e0] bg-white"
                >
                  Сбросить к исходным
                </button>
              </div>
            </div>
            {productsMessage && (
              <p className={`text-xs font-medium ${productsMessage.startsWith("Не удалось") ? "text-red-500" : "text-green-600"}`}>
                {productsMessage}
              </p>
            )}

            <div className="rounded-2xl border border-[#f0e8e0] bg-[#fff8f4] px-5 py-4 text-sm text-[#756c67] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span>Остатки, приёмка и инвентаризация теперь ведутся по партиям во вкладке «Склад».</span>
              <button onClick={() => setTab("inventory")} className="shrink-0 px-4 py-2 rounded-xl bg-white border border-[#eadfd8] text-[#c66d48] font-bold">Открыть склад</button>
            </div>

            {/* Список товаров */}
            <div className="bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#f0e8e0] flex items-center justify-between">
                <h2 className="font-bold">Редактировать товары</h2>
                <span className="text-xs text-[#aaa]">{allProducts.length} шт.</span>
              </div>
              <div className="divide-y divide-[#f0e8e0]">
                {allProducts
                  .filter((p) => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                  .map((p) => (
                  <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                    {/* Фото */}
                    <div className="w-14 h-14 rounded-2xl bg-[#fdf8f5] flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {p.images[0] ? (
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <ImageIcon size={20} className="text-[#ccc]" />
                      )}
                    </div>

                    {/* Инфо */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{p.name}</p>
                        {p.badge && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FDDCCA] text-[#8b4513]">{p.badge}</span>
                        )}
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${p.inStock ? "bg-green-100 text-green-700" : "bg-red-100 text-red-500"}`}>
                          {p.inStock ? "В наличии" : "Нет в наличии"}
                        </span>
                      </div>
                      <p className="text-xs text-[#aaa] mt-0.5">
                        {p.category === "bads" ? `БАД · ${p.weight}` : `Семена · ${(p.weightVariants ?? []).map((v) => v.label).join(" / ") || "фасовки не заданы"}`}
                        {p.stockQty !== undefined && <span> · Остаток: <b>{p.category === "seeds" ? (p.stockQty >= 1000 ? `${(p.stockQty / 1000).toLocaleString("ru-RU")} кг` : `${p.stockQty} г`) : `${p.stockQty} шт.`}</b></span>}
                      </p>
                    </div>

                    {/* Цена */}
                    <div className="text-right flex-shrink-0">
                      {p.category === "seeds" && p.weightVariants?.length ? (
                        <>
                          <p className="font-bold text-[#E8845A]">
                            от {Math.min(...p.weightVariants.map((v) => v.price)).toLocaleString("ru-RU")} ₽
                          </p>
                          <p className="text-[10px] text-[#aaa]">{p.weightVariants.length} фасовки</p>
                        </>
                      ) : (
                        <>
                          <p className="font-bold text-[#E8845A]">{p.price.toLocaleString("ru-RU")} ₽</p>
                          {p.oldPrice && <p className="text-xs text-[#aaa] line-through">{p.oldPrice.toLocaleString("ru-RU")} ₽</p>}
                        </>
                      )}
                    </div>

                    {/* Действия */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={async () => {
                          const result = await toggleStock(p.id);
                          setProductsMessage(result.ok
                            ? `Изменение наличия «${p.name}» сохранено.`
                            : `Не удалось сохранить наличие: ${result.error}`,
                          );
                        }}
                        title={p.inStock ? "Снять с продажи" : "Вернуть в продажу"}
                        className={`p-2 rounded-xl transition-all ${p.inStock ? "text-green-500 hover:bg-green-50" : "text-[#ccc] hover:bg-[#fdf8f5]"}`}
                      >
                        {p.inStock ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                      </button>
                      <button
                        onClick={() => openProductEditor(p)}
                        className="p-2 rounded-xl text-[#6b6b6b] hover:bg-[#fdf8f5] hover:text-[#E8845A] transition-all"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={async () => {
                          if (!confirm(`Удалить «${p.name}»?`)) return;
                          const result = await deleteProduct(p.id);
                          setProductsMessage(result.ok ? "Товар удалён из базы." : `Не удалось удалить товар: ${result.error}`);
                        }}
                        className="p-2 rounded-xl text-[#ccc] hover:bg-red-50 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-[#aaa] text-center">Здесь редактируются карточки и видимость товара. Остатки меняются только через партии во вкладке «Склад».</p>
          </div>
        )}
      </div>{/* /max-w-7xl */}

      {/* Модал: редактирование товара */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setEditingProduct(null)}>
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#f0e8e0] px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <p className="font-bold">Редактировать товар</p>
              <button onClick={() => setEditingProduct(null)} className="text-[#aaa] hover:text-[#1a1a1a]"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Название</label>
                <input
                  value={editingProduct.name}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Артикул</label>
                <input
                  value={editingProduct.sku || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value.trim().toUpperCase() || undefined })}
                  placeholder="Например, VZB-MGB-120"
                  className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                />
                <p className="mt-1.5 text-xs text-[#aaa]">Должен совпадать с артикулом в Ozon и не меняться для этого товара.</p>
              </div>
              {editingProduct.category === "bads" && (() => {
                const regular = editingProduct.oldPrice ?? editingProduct.price;
                const discount = editingProduct.discountPercent ?? 0;
                const finalPrice = discount > 0 ? Math.round(regular * (1 - discount / 100)) : regular;
                const setPricing = (reg: number, disc: number) => {
                  if (disc > 0) {
                    setEditingProduct({ ...editingProduct, oldPrice: reg, discountPercent: disc, price: Math.round(reg * (1 - disc / 100)) });
                  } else {
                    setEditingProduct({ ...editingProduct, oldPrice: undefined, discountPercent: undefined, price: reg });
                  }
                };
                return (
                  <div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Обычная цена (₽)</label>
                        <input
                          type="number"
                          value={regular}
                          onChange={(e) => setPricing(Number(e.target.value), discount)}
                          className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Скидка %</label>
                        <input
                          type="number"
                          min="0"
                          max="99"
                          value={discount || ""}
                          onChange={(e) => setPricing(regular, Math.min(99, Math.max(0, Number(e.target.value))))}
                          placeholder="0 — без скидки"
                          className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                        />
                      </div>
                    </div>
                    {/* Итоговая цена */}
                    <div className="mt-2 bg-[#fdf8f5] rounded-2xl px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-[#6b6b6b]">Цена на сайте:</span>
                      <span className="flex items-baseline gap-2">
                        <span className="font-bold text-[#E8845A] text-lg">{finalPrice.toLocaleString("ru-RU")} ₽</span>
                        {discount > 0 && (
                          <>
                            <span className="text-xs text-[#aaa] line-through">{regular.toLocaleString("ru-RU")} ₽</span>
                            <span className="text-xs font-bold bg-[#FF6B6B] text-white px-2 py-0.5 rounded-full">−{discount}%</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                );
              })()}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Бейдж</label>
                  <select
                    value={editingProduct.badge || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, badge: e.target.value || undefined })}
                    className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] bg-white"
                  >
                    <option value="">Без бейджа</option>
                    <option value="Хит">Хит</option>
                    <option value="Новинка">Новинка</option>
                    <option value="Скидка">Скидка</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">В наличии</label>
                  <select
                    value={editingProduct.inStock ? "true" : "false"}
                    onChange={(e) => setEditingProduct({ ...editingProduct, inStock: e.target.value === "true" })}
                    className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] bg-white"
                  >
                    <option value="true">Да, в наличии</option>
                    <option value="false">Нет в наличии</option>
                  </select>
                </div>
              </div>
              {editingProduct.category === "seeds" && (
                <div className="rounded-2xl border border-[#f0e8e0] bg-[#fdf8f5] p-4">
                  <div className="mb-4">
                    <p className="font-semibold text-sm">Цены по фасовкам</p>
                    <p className="mt-1 text-xs text-[#6b6b6b]">Для каждого веса укажите обычную цену и скидку. Цена на сайте посчитается автоматически.</p>
                  </div>
                  <div className="space-y-3">
                    {(editingProduct.weightVariants ?? []).map((variant, index) => {
                      const regular = variant.oldPrice ?? variant.price;
                      const calculatedDiscount = variant.oldPrice && variant.oldPrice > 0
                        ? Math.round(((variant.oldPrice - variant.price) / variant.oldPrice) * 100)
                        : 0;
                      const discount = variant.discountPercent ?? calculatedDiscount;
                      const finalPrice = discount > 0
                        ? Math.round(regular * (1 - discount / 100))
                        : regular;
                      const setVariantPricing = (reg: number, disc: number) => {
                        const safeRegular = Math.max(0, reg);
                        const safeDiscount = Math.min(99, Math.max(0, disc));
                        updateSeedVariant(index, safeDiscount > 0
                          ? {
                              oldPrice: safeRegular,
                              discountPercent: safeDiscount,
                              price: Math.round(safeRegular * (1 - safeDiscount / 100)),
                            }
                          : {
                              oldPrice: undefined,
                              discountPercent: undefined,
                              price: safeRegular,
                            });
                      };

                      return (
                        <div key={`${variant.grams}-${index}`} className="rounded-2xl border border-[#f0e8e0] bg-white p-3">
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <span className="font-bold text-sm">{variant.label}</span>
                            <span className="text-sm font-bold text-[#E8845A]">{finalPrice.toLocaleString("ru-RU")} ₽</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-[#6b6b6b] uppercase mb-1">Вес, г</label>
                              <input
                                type="number"
                                min="1"
                                value={variant.grams}
                                onChange={(e) => {
                                  const grams = Math.max(1, Number(e.target.value));
                                  updateSeedVariant(index, {
                                    grams,
                                    label: grams === 1000 ? "1 кг" : `${grams} г`,
                                  });
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#6b6b6b] uppercase mb-1">Обычная цена, ₽</label>
                              <input
                                type="number"
                                min="0"
                                value={regular}
                                onChange={(e) => setVariantPricing(Number(e.target.value), discount)}
                                className="w-full px-3 py-2 rounded-xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-[#6b6b6b] uppercase mb-1">Скидка, %</label>
                              <input
                                type="number"
                                min="0"
                                max="99"
                                value={discount || ""}
                                onChange={(e) => setVariantPricing(regular, Number(e.target.value))}
                                placeholder="0"
                                className="w-full px-3 py-2 rounded-xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                              />
                            </div>
                          </div>
                          {discount > 0 && (
                            <p className="mt-2 text-xs text-[#6b6b6b]">
                              На сайте: <b className="text-[#E8845A]">{finalPrice.toLocaleString("ru-RU")} ₽</b>
                              <span className="ml-2 line-through text-[#aaa]">{regular.toLocaleString("ru-RU")} ₽</span>
                              <span className="ml-2 text-[#FF6B6B] font-semibold">−{discount}%</span>
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {editingProduct.category === "bads" && (
              <div>
                <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Вес / объём</label>
                <input
                  value={editingProduct.weight}
                  onChange={(e) => setEditingProduct({ ...editingProduct, weight: e.target.value })}
                  placeholder="например: 60 капсул"
                  className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A]"
                />
              </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Описание</label>
                <textarea
                  value={editingProduct.description}
                  onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Состав</label>
                <textarea
                  value={editingProduct.composition}
                  onChange={(e) => setEditingProduct({ ...editingProduct, composition: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Как принимать</label>
                <textarea
                  value={editingProduct.howToTake}
                  onChange={(e) => setEditingProduct({ ...editingProduct, howToTake: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Путь к фото (через /products/...)</label>
                <input
                  value={editingProduct.images[0] || ""}
                  onChange={(e) => setEditingProduct({ ...editingProduct, images: e.target.value ? [e.target.value] : [] })}
                  placeholder="/products/название.jpg"
                  className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] font-mono text-xs"
                />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={async () => {
                  const variants = editingProduct.weightVariants;
                  const firstVariant = editingProduct.category === "seeds" && variants?.length ? variants[0] : null;
                  const result = await updateProduct(editingProduct.id, firstVariant
                    ? {
                        ...editingProduct,
                        price: firstVariant.price,
                        oldPrice: firstVariant.oldPrice,
                        discountPercent: firstVariant.discountPercent,
                        weight: (variants ?? []).map((v) => v.label).join(" / "),
                      }
                    : editingProduct);
                  if (!result.ok) {
                    setProductsMessage(`Не удалось сохранить товар: ${result.error}`);
                    return;
                  }
                  setProductSaved(true);
                  setTimeout(() => { setProductSaved(false); setEditingProduct(null); }, 1200);
                }}
                className="flex-1 bg-[#E8845A] hover:bg-[#d4703f] text-white font-bold py-3 rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                {productSaved ? <><Check size={16} /> Сохранено!</> : "Сохранить"}
              </button>
              <button onClick={() => setEditingProduct(null)} className="px-5 py-3 rounded-2xl border border-[#f0e8e0] text-[#6b6b6b] hover:bg-[#fdf8f5]">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модал: детали заказа */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#f0e8e0] px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <div>
                <p className="font-bold">{selectedOrder.id}</p>
                <p className="text-xs text-[#aaa]">{new Date(selectedOrder.date).toLocaleString("ru-RU")}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)}><X size={20} className="text-[#aaa] hover:text-[#1a1a1a]" /></button>
            </div>
            <div className="p-6 space-y-5">
              {relatedCustomerOrders.length > 0 && (
                <div className="rounded-2xl border border-[#F0B38F] bg-[#FFF4ED] p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[#E8845A] text-white">
                      <ShoppingBag size={17} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[#9A4F30]">
                        У покупателя {pendingOrdersLabel(relatedCustomerOrders.length)}
                      </p>
                      <p className="mt-1 text-sm text-[#7B5A4C]">Проверьте перед сборкой и отправкой: возможно, заказы нужно объединить.</p>
                      <div className="mt-3 space-y-2">
                        {relatedCustomerOrders.map((order) => (
                          <button
                            key={order.id}
                            type="button"
                            onClick={() => openOrderDetails(order)}
                            className="flex w-full flex-col gap-2 rounded-xl border border-[#F3D2C0] bg-white px-3 py-3 text-left transition-colors hover:border-[#E8845A] sm:flex-row sm:items-center sm:justify-between"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-mono text-xs font-bold text-[#E8845A]">{order.id}</span>
                              <span className="mt-0.5 block text-xs text-[#8A817C]">{new Date(order.date).toLocaleString("ru-RU")}</span>
                            </span>
                            <span className="flex flex-wrap items-center gap-2">
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
                                {STATUS_LABELS[order.status]}
                              </span>
                              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${paymentStatusInfo(order.paymentStatus).color}`}>
                                {paymentStatusInfo(order.paymentStatus).label}
                              </span>
                              <span className="whitespace-nowrap text-sm font-bold">{order.total.toLocaleString("ru-RU")} ₽</span>
                              <span className="text-xs font-semibold text-[#E8845A]">Открыть →</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-xs font-semibold text-[#aaa] uppercase tracking-wide">Покупатель и доставка</p>
                  <button
                    onClick={() => { setEditingOrderContacts((value) => !value); setOrderContactsMessage(""); }}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#f0e8e0] px-3 py-2 text-xs font-semibold text-[#6b6b6b] hover:border-[#E8845A] hover:text-[#E8845A]"
                  >
                    <Edit2 size={13} /> {editingOrderContacts ? "Отмена" : "Редактировать"}
                  </button>
                </div>
                {!editingOrderContacts ? (
                  <>
                    <p className="font-semibold">{selectedOrder.userName ?? "—"}</p>
                    <p className="text-sm text-[#6b6b6b]">{selectedOrder.userEmail}</p>
                    <p className="text-sm text-[#6b6b6b]">{selectedOrder.userPhone}</p>
                    <p className="mt-2 text-sm text-[#6b6b6b]">{selectedOrder.deliveryAddress}</p>
                    {orderContactsMessage && <p className="mt-2 text-sm font-medium text-green-600">{orderContactsMessage}</p>}
                  </>
                ) : (
                  <div className="rounded-2xl border border-[#f0e8e0] bg-[#fdf8f5] p-4">
                    <p className="mb-4 text-xs text-[#6b6b6b]">Изменения сохранятся только в этом заказе. Сумма, товары и оплата не изменятся.</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[#6b6b6b]">Email</label>
                        <input type="email" value={editOrderEmail} onChange={(event) => setEditOrderEmail(event.target.value)} className="w-full rounded-xl border border-[#f0e8e0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#E8845A]" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[#6b6b6b]">Телефон</label>
                        <input type="tel" value={editOrderPhone} onChange={(event) => setEditOrderPhone(event.target.value)} className="w-full rounded-xl border border-[#f0e8e0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#E8845A]" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[#6b6b6b]">Республика, область или регион</label>
                        <input value={editOrderRegion} onChange={(event) => setEditOrderRegion(event.target.value)} className="w-full rounded-xl border border-[#f0e8e0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#E8845A]" />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold text-[#6b6b6b]">Город</label>
                        <input value={editOrderCity} onChange={(event) => setEditOrderCity(event.target.value)} className="w-full rounded-xl border border-[#f0e8e0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#E8845A]" />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="mb-1 block text-xs font-semibold text-[#6b6b6b]">Адрес доставки или ПВЗ</label>
                      <textarea value={editOrderAddress} onChange={(event) => setEditOrderAddress(event.target.value)} rows={3} className="w-full resize-y rounded-xl border border-[#f0e8e0] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#E8845A]" />
                    </div>
                    {orderContactsMessage && <p className={`mt-3 text-sm font-medium ${orderContactsMessage === "Данные заказа сохранены" ? "text-green-600" : "text-red-600"}`}>{orderContactsMessage}</p>}
                    <button
                      disabled={orderContactsSaving}
                      onClick={async () => {
                        if (!confirm(`Сохранить новые контактные данные и адрес в заказе ${selectedOrder.id}?`)) return;
                        setOrderContactsSaving(true);
                        setOrderContactsMessage("");
                        try {
                          const response = await fetch("/api/admin/orders", {
                            method: "PATCH",
                            headers: { "content-type": "application/json", "x-admin-password": pw },
                            body: JSON.stringify({
                              action: "contacts",
                              orderId: selectedOrder.id,
                              email: editOrderEmail,
                              phone: editOrderPhone,
                              region: editOrderRegion,
                              city: editOrderCity,
                              address: editOrderAddress,
                            }),
                          });
                          const data = await response.json().catch(() => ({}));
                          if (!response.ok) throw new Error(data.error || "Не удалось сохранить данные заказа");
                          const deliveryAddress = [editOrderRegion.trim(), editOrderCity.trim(), editOrderAddress.trim()].filter(Boolean).join(", ");
                          const updates: Partial<Order> = {
                            userEmail: editOrderEmail.trim().toLowerCase(),
                            userPhone: editOrderPhone.trim(),
                            deliveryRegion: editOrderRegion.trim(),
                            deliveryCity: editOrderCity.trim(),
                            deliveryAddressLine: editOrderAddress.trim(),
                            deliveryAddress,
                          };
                          setSelectedOrder((order) => order ? { ...order, ...updates } : null);
                          setDbOrders((current) => current.map((order) => order.id === selectedOrder.id ? { ...order, ...updates } : order));
                          setOrderContactsMessage("Данные заказа сохранены");
                          setEditingOrderContacts(false);
                        } catch (error) {
                          setOrderContactsMessage(error instanceof Error ? error.message : "Не удалось сохранить данные заказа");
                        } finally {
                          setOrderContactsSaving(false);
                        }
                      }}
                      className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#E8845A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#d4703f] disabled:opacity-50"
                    >
                      <Check size={14} /> {orderContactsSaving ? "Сохраняем…" : "Сохранить изменения"}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#aaa] uppercase tracking-wide mb-2">Состав</p>
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-1.5 border-b border-[#f0e8e0] last:border-0">
                    <span>{item.name} × {item.quantity}</span>
                    <span className="font-semibold">{(item.price * item.quantity).toLocaleString("ru-RU")} ₽</span>
                  </div>
                ))}
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-[#6b6b6b]"><span>Товары</span><span>{selectedOrder.subtotal.toLocaleString("ru-RU")} ₽</span></div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>
                        Скидка
                        {selectedOrder.promoCode && ` · ${selectedOrder.promoCode}`}
                        {selectedOrder.promoDiscountPercent && ` (${selectedOrder.promoDiscountPercent}%)`}
                      </span>
                      <span>−{selectedOrder.discount.toLocaleString("ru-RU")} ₽</span>
                    </div>
                  )}
                  <div className="flex justify-between text-[#6b6b6b]"><span>Доставка</span><span>{selectedOrder.deliveryCost === 0 ? "Бесплатно" : `${selectedOrder.deliveryCost} ₽`}</span></div>
                  <div className="flex justify-between font-bold border-t border-[#f0e8e0] pt-2"><span>Итого</span><span className="text-[#E8845A]">{selectedOrder.total.toLocaleString("ru-RU")} ₽</span></div>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold text-[#aaa] uppercase tracking-wide mb-1">Доставка</p>
                  <p>{selectedOrder.deliveryMethod}</p>
                  <p className="text-[#6b6b6b]">{selectedOrder.deliveryAddress}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#aaa] uppercase tracking-wide mb-1">Оплата</p>
                  <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full ${paymentStatusInfo(selectedOrder.paymentStatus).color}`}>
                    {paymentStatusInfo(selectedOrder.paymentStatus).label}
                  </span>
                  <p className="mt-1 text-xs text-[#6b6b6b]">{selectedOrder.paymentMethod}</p>
                  {selectedOrder.paidAt && <p className="text-xs text-[#6b6b6b]">Оплачено {new Date(selectedOrder.paidAt).toLocaleString("ru-RU")}</p>}
                  {selectedOrder.stockWrittenOff && <p className="text-xs text-green-600">Остаток товара списан</p>}
                  {selectedOrder.promoCode && (
                    <p className="text-green-600">
                      Промокод: {selectedOrder.promoCode}
                      {selectedOrder.promoDiscountPercent ? ` · скидка ${selectedOrder.promoDiscountPercent}%` : ""}
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-[#f0e8e0] bg-white p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <p className="text-xs font-semibold text-[#aaa] uppercase tracking-wide">Письма покупателю</p>
                    <p className="text-xs text-[#6b6b6b] mt-1">Последнее письмо и история уведомлений по этому заказу.</p>
                  </div>
                  <button onClick={() => void loadOrderEmailLogs(selectedOrder.id)} className="p-2 rounded-xl border border-[#f0e8e0] text-[#6b6b6b] hover:text-[#E8845A]" title="Обновить письма"><RefreshCw size={15} className={orderEmailLogsLoading ? "animate-spin" : ""} /></button>
                </div>
                {orderEmailLogsLoading ? <p className="text-sm text-[#aaa]">Проверяем журнал…</p> : orderEmailLogs.length === 0 ? <p className="text-sm text-[#aaa]">Писем по заказу пока не было.</p> : (
                  <div className="space-y-2">
                    {orderEmailLogs.slice(0, 3).map((log) => (
                      <div key={log.id} className="rounded-xl bg-[#fdf8f5] px-3 py-2.5 text-sm">
                        <p className="font-medium">{log.subject}</p>
                        <p className="text-xs text-[#6b6b6b] mt-1">{new Date(log.created_at).toLocaleString("ru-RU")} · {log.status === "sent" ? "отправлено" : "ошибка"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="bg-[#fdf8f5] rounded-2xl p-5">
                <p className="text-xs font-semibold text-[#aaa] uppercase tracking-wide mb-3">Статус заказа</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {(Object.entries(STATUS_LABELS) as [Order["status"], string][]).map(([s, l]) => (
                    <button
                      key={s}
                      onClick={() => setEditStatus(s)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                        editStatus === s
                          ? "border-[#E8845A] bg-[#E8845A] text-white"
                          : "border-[#f0e8e0] bg-white text-[#6b6b6b] hover:border-[#E8845A]"
                      }`}
                    >{l}</button>
                  ))}
                </div>
                <input
                  value={editTrack}
                  onChange={(e) => setEditTrack(e.target.value)}
                  placeholder="Трек-номер (необязательно)"
                  className="w-full px-4 py-2.5 rounded-xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] mb-3 bg-white"
                />
                <button
                  onClick={async () => {
                    setStatusSaved(false);
                    setOrdersError("");
                    try {
                      const response = await fetch("/api/admin/orders", {
                        method: "PATCH",
                        headers: {
                          "content-type": "application/json",
                          "x-admin-password": pw,
                        },
                        body: JSON.stringify({
                          orderId: selectedOrder.id,
                          status: editStatus,
                          trackNumber: editTrack,
                        }),
                      });
                      const data = await response.json();
                      if (!response.ok) throw new Error(data.error || "Не удалось сохранить статус");
                      setSelectedOrder((prev) => prev ? { ...prev, status: editStatus, trackNumber: editTrack || undefined } : null);
                      setDbOrders((current) => current.map((order) =>
                        order.id === selectedOrder.id
                          ? { ...order, status: editStatus, trackNumber: editTrack || undefined }
                          : order
                      ));
                      void loadOrderEmailLogs(selectedOrder.id);
                      setStatusSaved(true);
                      setTimeout(() => setStatusSaved(false), 2000);
                    } catch (error) {
                      setOrdersError(error instanceof Error ? error.message : "Не удалось сохранить статус");
                    }
                  }}
                  className="flex items-center gap-2 bg-[#E8845A] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#d4703f] transition-all"
                >
                  {statusSaved ? <><Check size={14} /> Сохранено</> : "Сохранить статус"}
                </button>
              </div>
              {selectedOrder.canDelete && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
                  <p className="font-semibold text-red-700 text-sm">Удаление заказа</p>
                  <p className="text-xs text-red-600 mt-1">Этот заказ не оплачен, отменён или завершился ошибкой. Его можно убрать из дашборда и отчётов; отменить удаление будет нельзя.</p>
                  <button
                    onClick={async () => {
                      if (!confirm(`Точно удалить заказ ${selectedOrder.id}? Это действие нельзя отменить.`)) return;
                      try {
                        const response = await fetch(`/api/admin/orders?id=${encodeURIComponent(selectedOrder.id)}&confirm=true`, { method: "DELETE", headers: { "x-admin-password": pw } });
                        const data = await response.json().catch(() => ({}));
                        if (!response.ok) throw new Error(data.error || "Не удалось удалить заказ");
                        setDbOrders((current) => current.filter((order) => order.id !== selectedOrder.id));
                        setSelectedOrder(null);
                      } catch (error) {
                        setOrdersError(error instanceof Error ? error.message : "Не удалось удалить заказ");
                      }
                    }}
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 text-sm font-semibold"
                  ><Trash2 size={15} /> Удалить заказ</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модал: профиль покупателя */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedCustomerId(null)}>
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#f0e8e0] px-6 py-4 flex items-center justify-between rounded-t-3xl">
              <p className="font-bold">Профиль покупателя</p>
              <button onClick={() => setSelectedCustomerId(null)}><X size={20} className="text-[#aaa] hover:text-[#1a1a1a]" /></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-[#FDDCCA] flex items-center justify-center text-2xl font-bold text-[#8b4513]">
                  {selectedCustomer.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-lg">{selectedCustomer.name}</p>
                  <p className="text-sm text-[#6b6b6b]">{selectedCustomer.email}</p>
                  <p className="text-sm text-[#6b6b6b]">{selectedCustomer.phone}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Заказов", value: selectedCustomer.ordersCount },
                  { label: "Сумма", value: `${selectedCustomer.totalSpent.toLocaleString("ru-RU")} ₽` },
                  { label: "Средний чек", value: `${selectedCustomer.avgCheck.toLocaleString("ru-RU")} ₽` },
                ].map((s, i) => (
                  <div key={i} className="bg-[#fdf8f5] rounded-2xl p-4 text-center">
                    <p className="text-xl font-bold text-[#E8845A]">{s.value}</p>
                    <p className="text-xs text-[#aaa] mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[#aaa]">
                Регистрация: {new Date(selectedCustomer.createdAt).toLocaleDateString("ru-RU")} · Бонусы: {selectedCustomer.bonusPoints} · Реф. код: {selectedCustomer.referralCode}
              </p>
              <div>
                <p className="text-xs font-semibold text-[#aaa] uppercase tracking-wide mb-3">История заказов</p>
                {selectedCustomer.userOrders.length === 0 ? (
                  <p className="text-sm text-[#aaa]">Заказов нет</p>
                ) : (
                  <div className="space-y-2">
                    {[...selectedCustomer.userOrders]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((o) => (
                        <div key={o.id} className="p-4 bg-[#fdf8f5] rounded-2xl">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <p className="font-mono text-xs font-semibold text-[#E8845A]">{o.id}</p>
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status]}`}>{STATUS_LABELS[o.status]}</span>
                            </div>
                            <p className="font-bold text-sm">{o.total.toLocaleString("ru-RU")} ₽</p>
                          </div>
                          <p className="text-xs text-[#6b6b6b]">{new Date(o.date).toLocaleDateString("ru-RU")} · {o.items.length} поз. · {o.deliveryMethod}</p>
                          {o.items.slice(0, 2).map((item, i) => (
                            <p key={i} className="text-xs text-[#aaa] truncate">{item.name} × {item.quantity}</p>
                          ))}
                          {o.items.length > 2 && <p className="text-xs text-[#aaa]">...и ещё {o.items.length - 2}</p>}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
