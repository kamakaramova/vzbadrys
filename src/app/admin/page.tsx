"use client";
import { useState, useMemo, useEffect } from "react";
import { useAuthStore, Order, STATUS_LABELS } from "@/store/authStore";
import {
  BarChart2, Users, ShoppingBag, TrendingUp,
  Search, Download, ChevronUp, ChevronDown,
  X, Check, Package, Eye, Tag, Trash2, ToggleLeft, ToggleRight,
} from "lucide-react";
import { usePromoStore } from "@/store/promoStore";

const ADMIN_PASSWORD = "vzbadris2026";

type Tab = "dashboard" | "orders" | "customers" | "promos";
type SortField = "name" | "email" | "totalSpent" | "ordersCount" | "avgCheck" | "lastOrder" | "createdAt";
type SortDir = "asc" | "desc";
type OrderSortField = "date" | "total" | "status" | "userName";

const STATUS_COLORS: Record<Order["status"], string> = {
  processing: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

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

export default function AdminPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
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

  const [newPromoCode, setNewPromoCode] = useState("");
  const [newPromoDiscount, setNewPromoDiscount] = useState("");
  const [promoHasExpiry, setPromoHasExpiry] = useState(false);
  const [newPromoExpiry, setNewPromoExpiry] = useState("");
  const [promoFormError, setPromoFormError] = useState("");
  const [promoAdded, setPromoAdded] = useState(false);

  const store = useAuthStore();
  const promoStore = usePromoStore();

  const users = mounted ? store.users : [];
  const orders = mounted ? store.orders : [];
  const updateOrderStatus = store.updateOrderStatus;
  const promos = mounted ? promoStore.promos : [];
  const { addPromo, togglePromo, deletePromo } = promoStore;

  const customerStats = useMemo(() => {
    return users.map((u) => {
      const userOrders = orders.filter(
        (o) => o.userId === u.id || o.userEmail === u.email
      );
      const totalSpent = userOrders.reduce((s, o) => s + o.total, 0);
      const ordersCount = userOrders.length;
      const avgCheck = ordersCount > 0 ? Math.round(totalSpent / ordersCount) : 0;
      const sorted = [...userOrders].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      const lastOrder = sorted.length > 0 ? sorted[0].date : null;
      return { ...u, totalSpent, ordersCount, avgCheck, lastOrder, userOrders };
    });
  }, [users, orders]);

  const paidOrders = orders.filter((o) => o.status !== "cancelled");
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

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };
  const toggleOrderSort = (field: OrderSortField) => {
    if (orderSortField === field) setOrderSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setOrderSortField(field); setOrderSortDir("desc"); }
  };

  const SIcon = ({ f, cur, dir }: { f: string; cur: string; dir: SortDir }) => (
    <span className="inline-flex ml-1 opacity-40">
      {cur === f ? (dir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} />}
    </span>
  );

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
        "Товары (руб)": o.subtotal, "Скидка (руб)": o.discount,
        "Доставка (руб)": o.deliveryCost, "Итого (руб)": o.total,
        "Промокод": o.promoCode ?? "", "Доставка": o.deliveryMethod,
        "Адрес": o.deliveryAddress, "Оплата": o.paymentMethod,
        "Трек": o.trackNumber ?? "",
      })),
      `заказы_${new Date().toISOString().slice(0, 10)}.csv`
    );

  const selectedCustomer = selectedCustomerId
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
          <p className="text-sm text-[#aaa] text-center mb-8">Взбадрись</p>
          <div className="space-y-4">
            <input
              type="password"
              placeholder="Пароль"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setPwError(false); }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (pw === ADMIN_PASSWORD) setAuthed(true);
                  else setPwError(true);
                }
              }}
              className={`w-full px-4 py-3 rounded-2xl border text-sm outline-none transition-colors ${
                pwError ? "border-red-300 bg-red-50" : "border-[#f0e8e0] focus:border-[#E8845A]"
              }`}
            />
            {pwError && <p className="text-xs text-red-400">Неверный пароль</p>}
            <button
              onClick={() => { if (pw === ADMIN_PASSWORD) setAuthed(true); else setPwError(true); }}
              className="w-full bg-[#E8845A] hover:bg-[#d4703f] text-white font-bold py-3 rounded-full transition-all"
            >
              Войти
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfcfb]">
      {/* Шапка */}
      <div className="bg-white border-b border-[#f0e8e0] px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#E8845A] flex items-center justify-center">
            <span className="text-white font-black text-sm">В</span>
          </div>
          <div>
            <p className="font-bold leading-tight">Взбадрись</p>
            <p className="text-xs text-[#aaa]">Панель управления</p>
          </div>
        </div>
        <button onClick={() => setAuthed(false)} className="text-xs text-[#aaa] hover:text-[#E8845A]">Выйти</button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Табы */}
        <div className="flex gap-2 mb-8 bg-[#f5f0ec] p-1.5 rounded-2xl w-fit">
          {(["dashboard", "orders", "customers", "promos"] as const).map((id) => {
            const labels: Record<typeof id, string> = { dashboard: "Дашборд", orders: "Заказы", customers: "Покупатели", promos: "Промокоды" };
            const icons: Record<typeof id, React.ReactNode> = {
              dashboard: <BarChart2 size={15} />,
              orders: <ShoppingBag size={15} />,
              customers: <Users size={15} />,
              promos: <Tag size={15} />,
            };
            return (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Выручка", value: `${totalRevenue.toLocaleString("ru-RU")} ₽`, Icon: TrendingUp, color: "text-[#E8845A]" },
                { label: "Заказов всего", value: orders.length, Icon: ShoppingBag, color: "text-blue-500" },
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
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(Object.entries(STATUS_LABELS) as [Order["status"], string][]).map(([status, label]) => (
                  <div key={status} className="text-center p-4 rounded-2xl bg-[#fdf8f5]">
                    <p className="text-2xl font-bold mb-1">{orders.filter((o) => o.status === status).length}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

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
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[o.status]}`}>
                            {STATUS_LABELS[o.status]}
                          </span>
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
              <button
                onClick={exportOrders}
                className="flex items-center gap-2 bg-[#E8845A] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#d4703f] transition-all"
              >
                <Download size={15} /> Скачать CSV
              </button>
            </div>

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
                      <tr><td colSpan={6} className="text-center py-12 text-[#aaa] text-sm">Заказов нет</td></tr>
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
                        <td className="px-5 py-3 font-bold whitespace-nowrap">{o.total.toLocaleString("ru-RU")} ₽</td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => { setSelectedOrder(o); setEditStatus(o.status); setEditTrack(o.trackNumber ?? ""); setStatusSaved(false); }}
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

        {/* ПРОМОКОДЫ */}
        {tab === "promos" && (
          <div className="space-y-6">
            {/* Форма добавления */}
            <div className="bg-white rounded-3xl border border-[#f0e8e0] p-6">
              <h2 className="font-bold mb-5 flex items-center gap-2"><Tag size={16} className="text-[#E8845A]" /> Создать промокод</h2>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-[#6b6b6b] uppercase tracking-wide mb-1.5">Промокод</label>
                  <input
                    value={newPromoCode}
                    onChange={(e) => { setNewPromoCode(e.target.value.toUpperCase()); setPromoFormError(""); }}
                    placeholder="например: ЛЕТО20"
                    className="w-full px-4 py-3 rounded-2xl border border-[#f0e8e0] text-sm outline-none focus:border-[#E8845A] font-mono uppercase"
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
                    onClick={() => {
                      if (promoHasExpiry && !newPromoExpiry) {
                        setPromoFormError("Укажите дату окончания");
                        return;
                      }
                      const result = addPromo(
                        newPromoCode,
                        Number(newPromoDiscount),
                        promoHasExpiry ? newPromoExpiry : undefined
                      );
                      if (result.ok) {
                        setNewPromoCode("");
                        setNewPromoDiscount("");
                        setNewPromoExpiry("");
                        setPromoHasExpiry(false);
                        setPromoFormError("");
                        setPromoAdded(true);
                        setTimeout(() => setPromoAdded(false), 2000);
                      } else {
                        setPromoFormError(result.error ?? "Ошибка");
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
              <p className="text-xs text-[#aaa] mt-3">Промокод автоматически становится активным и сразу начинает работать в корзине.</p>
            </div>

            {/* Список промокодов */}
            <div className="bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#f0e8e0] flex items-center justify-between">
                <h2 className="font-bold">Все промокоды</h2>
                <span className="text-xs text-[#aaa]">{promos.length} шт.</span>
              </div>
              {promos.length === 0 ? (
                <div className="py-12 text-center text-[#aaa] text-sm">Промокодов нет — создайте первый</div>
              ) : (
                <div className="divide-y divide-[#f0e8e0]">
                  {promos.map((p) => (
                    <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                      {/* Статус */}
                      <button onClick={() => togglePromo(p.id)} className="flex-shrink-0">
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
                      </div>
                      {/* Скидка */}
                      <div className="text-center flex-shrink-0 w-16">
                        <p className="text-2xl font-black text-[#E8845A]">{p.discount}%</p>
                        <p className="text-xs text-[#aaa]">скидка</p>
                      </div>
                      {/* Удалить */}
                      <button
                        onClick={() => { if (confirm(`Удалить промокод ${p.code}?`)) deletePromo(p.id); }}
                        className="flex-shrink-0 p-2 rounded-xl hover:bg-red-50 text-[#ccc] hover:text-red-400 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Подсказка */}
            <div className="bg-[#fdf8f5] rounded-2xl border border-[#f0e8e0] p-5 text-sm text-[#6b6b6b] space-y-1.5">
              <p className="font-semibold text-[#1a1a1a] mb-2">Как работают промокоды</p>
              <p>· Активные промокоды сразу работают в корзине — покупатель вводит код и получает скидку</p>
              <p>· Отключённый промокод перестаёт работать мгновенно, код никуда не исчезает</p>
              <p>· Реферальные коды покупателей (из личного кабинета) дают фиксированную скидку 5%</p>
              <p>· Промокод нельзя совмещать с другим промокодом или реферальным кодом</p>
            </div>
          </div>
        )}
      </div>{/* /max-w-7xl */}

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
              <div>
                <p className="text-xs font-semibold text-[#aaa] uppercase tracking-wide mb-2">Покупатель</p>
                <p className="font-semibold">{selectedOrder.userName ?? "—"}</p>
                <p className="text-sm text-[#6b6b6b]">{selectedOrder.userEmail}</p>
                <p className="text-sm text-[#6b6b6b]">{selectedOrder.userPhone}</p>
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
                    <div className="flex justify-between text-green-600"><span>Скидка</span><span>−{selectedOrder.discount.toLocaleString("ru-RU")} ₽</span></div>
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
                  <p>{selectedOrder.paymentMethod}</p>
                  {selectedOrder.promoCode && <p className="text-green-600">Промокод: {selectedOrder.promoCode}</p>}
                </div>
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
                  onClick={() => {
                    updateOrderStatus(selectedOrder.id, editStatus, editTrack || undefined);
                    setSelectedOrder((prev) => prev ? { ...prev, status: editStatus, trackNumber: editTrack || prev.trackNumber } : null);
                    setStatusSaved(true);
                    setTimeout(() => setStatusSaved(false), 2000);
                  }}
                  className="flex items-center gap-2 bg-[#E8845A] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#d4703f] transition-all"
                >
                  {statusSaved ? <><Check size={14} /> Сохранено</> : "Сохранить статус"}
                </button>
              </div>
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
