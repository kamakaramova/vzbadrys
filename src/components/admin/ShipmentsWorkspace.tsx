"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Clipboard, ListChecks, Printer, RefreshCw, Search, Send, SquareCheckBig } from "lucide-react";

type Warehouse = {
  actualDeliveryCost: number | null;
  dispatchPoint: string;
  internalComment: string;
  orderChecked: boolean;
  assembled: boolean;
  fiscalReceiptDone: boolean;
  honestSignDone: boolean;
  batchesAssigned: boolean;
  handedToDelivery: boolean;
  updatedAt: string;
};
type Shipment = {
  id: string; createdAt: string; orderStatus: string; customerName: string; email: string; phone: string;
  items: Array<{ id: string; productId: string; name: string; quantity: number; stockAmount: number; allocations: Array<{ batchId: string | null; lotNumber: string | null; quantity: number }> }>; itemsCount: number; total: number;
  deliveryMethod: string; deliveryAddress: string; customerDeliveryCost: number; trackNumber: string; warehouse: Warehouse;
};

const ORDER_STATUSES = [
  ["processing", "Новый"],
  ["confirmed", "На сборке"],
  ["shipped", "Передан в доставку"],
  ["delivered", "Завершён"],
  ["cancelled", "Отменён"],
] as const;

const STATUS_STYLE: Record<string, string> = {
  processing: "bg-yellow-50 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-purple-50 text-purple-700 border-purple-200",
  delivered: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
};
const STATUS_ORDER: Record<string, number> = Object.fromEntries(ORDER_STATUSES.map(([value], index) => [value, index]));

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" });
const money = (value: number) => `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`;
const STORAGE_KEY = "vzbadrys-admin-shipments-view";

function savedView() {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null") as null | {
      from?: string; to?: string; search?: string; onlyIncomplete?: boolean; statusSort?: "none" | "asc" | "desc"; scrollLeft?: number; scrollTop?: number;
    };
  } catch { return null; }
}

export default function ShipmentsWorkspace({ password }: { password: string }) {
  const [rows, setRows] = useState<Shipment[]>([]);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [statusSort, setStatusSort] = useState<"none" | "asc" | "desc">("none");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [copiedOrder, setCopiedOrder] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [batchStatus, setBatchStatus] = useState("confirmed");
  const [batchSaving, setBatchSaving] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const editingRef = useRef(false);
  const savingRef = useRef(false);
  const restoredViewRef = useRef(false);
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/shipments?from=${from}&to=${to}`, { headers: { "x-admin-password": password }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось загрузить отгрузки");
      setRows(data.shipments || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить отгрузки"); }
    finally { if (!quiet) setLoading(false); }
  };
  useEffect(() => {
    const id = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(id);
  }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!editingRef.current && !savingRef.current && saveTimers.current.size === 0 && document.visibilityState === "visible") void load(true);
    }, 30_000);
    return () => window.clearInterval(id);
  }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const id = window.setTimeout(() => {
      const view = savedView();
      if (!view) { restoredViewRef.current = true; return; }
      if (view.from) setFrom(view.from);
      if (view.to) setTo(view.to);
      setSearch(view.search || "");
      setOnlyIncomplete(Boolean(view.onlyIncomplete));
      setStatusSort(view.statusSort || "none");
      requestAnimationFrame(() => {
        if (!tableRef.current) return;
        tableRef.current.scrollLeft = view.scrollLeft || 0;
        tableRef.current.scrollTop = view.scrollTop || 0;
      });
      restoredViewRef.current = true;
    }, 0);
    return () => window.clearTimeout(id);
  }, []);
  const rememberView = () => {
    const table = tableRef.current;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      from, to, search, onlyIncomplete, statusSort, scrollLeft: table?.scrollLeft || 0, scrollTop: table?.scrollTop || 0,
    }));
  };
  useEffect(() => {
    if (!restoredViewRef.current) return;
    rememberView();
  }, [from, to, search, onlyIncomplete, statusSort]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => {
    const filtered = rows.filter((row) => {
      const q = search.trim().toLowerCase();
      const matches = !q || [row.id, row.customerName, row.email, row.phone, row.deliveryAddress]
        .some((value) => value.toLowerCase().includes(q));
      const w = row.warehouse;
      const incomplete = !w.orderChecked || !w.assembled || !w.fiscalReceiptDone || !w.honestSignDone;
      return matches && (!onlyIncomplete || incomplete);
    });
    if (statusSort === "none") return filtered;
    const direction = statusSort === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => direction * ((STATUS_ORDER[a.orderStatus] ?? 99) - (STATUS_ORDER[b.orderStatus] ?? 99)));
  }, [rows, search, onlyIncomplete, statusSort]);

  const selectedRows = useMemo(() => rows.filter((row) => selectedIds.includes(row.id)), [rows, selectedIds]);

  const toggleStatusSort = () => setStatusSort((current) => current === "none" ? "asc" : current === "asc" ? "desc" : "none");

  const updateLocal = (id: string, changes: Partial<Warehouse>) => setRows((current) => current.map((row) =>
    row.id === id ? { ...row, warehouse: { ...row.warehouse, ...changes } } : row));
  const save = async (id: string, changes: Partial<Warehouse>) => {
    savingRef.current = true; setSaving(id); setSaved(null); setError("");
    try {
      const response = await fetch("/api/admin/shipments", {
        method: "PATCH", headers: { "content-type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ orderId: id, changes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось сохранить");
      setSaved(id); window.setTimeout(() => setSaved((value) => value === id ? null : value), 1800);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось сохранить"); await load(); }
    finally { savingRef.current = false; setSaving(null); }
  };
  const scheduleSave = (id: string, key: keyof Warehouse, value: unknown, delay = 650) => {
    const timerKey = `${id}:${key}`;
    const existing = saveTimers.current.get(timerKey);
    if (existing) clearTimeout(existing);
    saveTimers.current.set(timerKey, setTimeout(() => {
      saveTimers.current.delete(timerKey);
      void save(id, { [key]: value });
    }, delay));
  };
  const toggle = (row: Shipment, key: keyof Warehouse) => {
    const value = !Boolean(row.warehouse[key]); updateLocal(row.id, { [key]: value }); save(row.id, { [key]: value });
  };
  const updateOrderStatus = async (row: Shipment, orderStatus: string) => {
    const previousStatus = row.orderStatus;
    setRows((current) => current.map((item) => item.id === row.id ? { ...item, orderStatus } : item));
    setStatusSaving(row.id); setStatusMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: { "content-type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ orderId: row.id, status: orderStatus, trackNumber: row.trackNumber }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось изменить статус");
      return data.email as "sent" | "skipped" | "failed";
    } catch (e) {
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, orderStatus: previousStatus } : item));
      throw new Error(e instanceof Error ? e.message : "Не удалось изменить статус");
    } finally { setStatusSaving(null); }
  };
  const changeOrderStatus = async (row: Shipment, orderStatus: string) => {
    try {
      const email = await updateOrderStatus(row, orderStatus);
      if (email === "failed") setStatusMessage(`Статус заказа ${row.id} сохранён, но письмо покупателю не отправилось.`);
      else if (email === "sent") setStatusMessage(`Статус заказа ${row.id} сохранён, письмо покупателю отправлено.`);
      else setStatusMessage(`Статус заказа ${row.id} сохранён.`);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось изменить статус"); }
  };
  const quickRange = (days: number) => {
    const end = new Date(); const start = new Date(); start.setDate(end.getDate() - days + 1);
    setFrom(start.toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" })); setTo(today());
  };

  const checks: Array<[keyof Warehouse, string]> = [
    ["orderChecked", "Проверен"], ["assembled", "Собран"], ["fiscalReceiptDone", "Чек Ozon"],
    ["honestSignDone", "Честный знак"],
  ];

  const summary = useMemo(() => {
    const revenue = rows.reduce((sum, row) => sum + row.total, 0);
    const deliveryCollected = rows.reduce((sum, row) => sum + row.customerDeliveryCost, 0);
    const completedCosts = rows.filter((row) => row.warehouse.actualDeliveryCost !== null);
    const actualDelivery = completedCosts.reduce((sum, row) => sum + Number(row.warehouse.actualDeliveryCost), 0);
    const completedDeliveryCollected = completedCosts.reduce((sum, row) => sum + row.customerDeliveryCost, 0);
    const statusCounts = rows.reduce<Record<string, number>>((counts, row) => {
      counts[row.orderStatus] = (counts[row.orderStatus] || 0) + 1;
      return counts;
    }, {});
    return { revenue, deliveryCollected, actualDelivery, deliveryBalance: completedDeliveryCollected - actualDelivery, completedCosts: completedCosts.length, statusCounts };
  }, [rows]);

  const copyOrder = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopiedOrder(id);
    window.setTimeout(() => setCopiedOrder((value) => value === id ? null : value), 1500);
  };

  const toggleSelected = (id: string) => setSelectedIds((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const toggleAllVisible = () => setSelectedIds((current) => {
    const visibleIds = visible.map((row) => row.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => current.includes(id));
    return allSelected ? current.filter((id) => !visibleIds.includes(id)) : [...new Set([...current, ...visibleIds])];
  });
  const changeSelectedStatus = async () => {
    if (!selectedRows.length) return;
    setBatchSaving(true); setStatusMessage(""); setError("");
    let sent = 0; let failed = 0;
    try {
      for (const row of selectedRows) {
        const email = await updateOrderStatus(row, batchStatus);
        if (email === "sent") sent += 1;
        if (email === "failed") failed += 1;
      }
      const label = ORDER_STATUSES.find(([value]) => value === batchStatus)?.[1] || "выбран";
      setStatusMessage(`${selectedRows.length} ${selectedRows.length === 1 ? "заказ переведён" : "заказа переведены"} в статус «${label}»${sent ? `, писем отправлено: ${sent}` : ""}${failed ? `, не отправились: ${failed}` : ""}.`);
      setSelectedIds([]);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось изменить часть заказов"); }
    finally { setBatchSaving(false); }
  };
  const printDocument = (kind: "assembly" | "register") => {
    const documentRows = selectedRows.length ? selectedRows : visible;
    if (!documentRows.length) { setError("Нет заказов для печати"); return; }
    const escape = (value: string) => value.replace(/[&<>\"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[char] || char);
    const title = kind === "assembly" ? "Лист сборки" : "Реестр отправлений";
    const period = `${from.split("-").reverse().join(".")} — ${to.split("-").reverse().join(".")}`;
    const body = kind === "assembly"
      ? Object.values(documentRows.flatMap((row) => row.items.map((item) => ({ ...item, orderId: row.id }))).reduce<Record<string, { name: string; quantity: number; orders: string[]; lots: string[] }>>((result, item) => {
          const key = item.productId || item.name;
          const entry = result[key] || { name: item.name, quantity: 0, orders: [], lots: [] };
          entry.quantity += item.quantity; entry.orders.push(item.orderId);
          item.allocations.forEach((allocation) => { if (allocation.lotNumber) entry.lots.push(`${allocation.lotNumber} × ${allocation.quantity}`); });
          result[key] = entry; return result;
        }, {})).map((item, index) => `<tr><td>${index + 1}</td><td><b>${escape(item.name)}</b></td><td class="num">${item.quantity}</td><td>${escape([...new Set(item.lots)].join(", ") || "Партия не указана")}</td><td>${escape(item.orders.join(", "))}</td></tr>`).join("")
      : documentRows.map((row, index) => `<tr><td>${index + 1}</td><td><b>${escape(row.id)}</b><br><small>${new Date(row.createdAt).toLocaleDateString("ru-RU")}</small></td><td>${escape(row.customerName)}<br><small>${escape(row.phone)} · ${escape(row.email)}</small></td><td>${escape(row.deliveryMethod)}<br>${escape(row.deliveryAddress)}</td><td class="num">${escape(money(row.total))}<br><small>доставка: ${escape(money(row.customerDeliveryCost))}</small></td><td>${escape(row.trackNumber || "—")}</td></tr>`).join("");
    const headings = kind === "assembly" ? ["№", "Товар", "Кол-во", "Партия", "Заказы"] : ["№", "Заказ", "Покупатель", "Доставка / адрес", "Сумма", "Трек"];
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) { setError("Разрешите всплывающие окна, чтобы открыть печать"); return; }
    printWindow.document.write(`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;color:#211f1e;padding:28px}h1{margin:0 0 6px;font-size:25px}p{margin:0 0 20px;color:#6f6863}table{border-collapse:collapse;width:100%;font-size:12px}th{background:#faefe9;text-align:left}th,td{border:1px solid #dcd3ce;padding:9px;vertical-align:top}.num{white-space:nowrap;font-weight:700}small{color:#746d68}@media print{body{padding:0}}</style></head><body><h1>${title}</h1><p>Период: ${period}. Заказов: ${documentRows.length}${selectedRows.length ? " (выбрано вручную)" : ""}.</p><table><thead><tr>${headings.map((heading) => `<th>${heading}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
    printWindow.document.close();
  };

  return <section className="space-y-4 w-full min-w-0">
    <div className="flex flex-col xl:flex-row xl:items-end gap-3 justify-between">
      <div><h2 className="text-xl font-bold flex items-center gap-2">Отгрузки <span className="inline-flex min-w-7 h-7 px-2 items-center justify-center rounded-full bg-[#fff0e8] text-[#c66d48] text-xs tabular-nums">{rows.length}</span></h2><p className="text-sm text-[#8f8782] mt-1">Только оплаченные заказы. Поля сохраняются автоматически, таблица обновляется каждые 30 секунд.</p></div>
      <button onClick={() => void load()} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#eadfd8] bg-white font-semibold text-sm"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/>{loading ? "Загрузка…" : "Обновить"}</button>
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-2.5">
      {[
        ["Заказов", String(rows.length), "За выбранные даты"],
        ["Оплачено покупателями", money(summary.revenue), "Вся сумма, включая доставку"],
        ["Получено за доставку", money(summary.deliveryCollected), "По всем заказам периода"],
        ["Доставка по факту", money(summary.actualDelivery), `Заполнено: ${summary.completedCosts} из ${rows.length}`],
      ].map(([label, value, note]) => <div key={label} className="rounded-2xl border border-[#eee4de] bg-white px-4 py-3 min-w-0"><div className="text-xs font-semibold text-[#8b817b]">{label}</div><div className="mt-1 text-xl font-extrabold tabular-nums truncate">{value}</div><div className="mt-0.5 text-[11px] text-[#aaa]">{note}</div></div>)}
      <div className={`col-span-2 xl:col-span-1 rounded-2xl border px-4 py-3 ${summary.deliveryBalance < 0 ? "border-red-200 bg-red-50" : "border-green-200 bg-green-50"}`}>
        <div className={`text-xs font-semibold ${summary.deliveryBalance < 0 ? "text-red-700" : "text-green-700"}`}>Разница по доставке</div>
        <div className={`mt-1 text-xl font-extrabold tabular-nums ${summary.deliveryBalance < 0 ? "text-red-700" : "text-green-700"}`}>{summary.deliveryBalance > 0 ? "+" : ""}{money(summary.deliveryBalance)}</div>
        <div className="mt-0.5 text-[11px] text-[#8b817b]">Только заказы с заполненным фактом</div>
      </div>
    </div>
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
      {[
        ["Новые", summary.statusCounts.processing || 0, "Ещё не переданы на сборку", "border-amber-200 bg-amber-50", "text-amber-800"],
        ["На сборке", summary.statusCounts.confirmed || 0, "Нужно подготовить к отправке", "border-orange-200 bg-orange-50", "text-orange-800"],
        ["Переданы в доставку", summary.statusCounts.shipped || 0, "Уже отгружены", "border-purple-200 bg-purple-50", "text-purple-700"],
        ["Завершены", summary.statusCounts.delivered || 0, "Заказ получен покупателем", "border-green-200 bg-green-50", "text-green-700"],
      ].map(([label, value, note, cardClass, valueClass]) => <div key={label} className={`rounded-2xl border px-4 py-3 ${cardClass}`}>
        <div className="text-xs font-semibold text-[#756c67]">{label}</div>
        <div className={`mt-1 text-xl font-extrabold tabular-nums ${valueClass}`}>{value}</div>
        <div className="mt-0.5 text-[11px] text-[#8b817b]">{note}</div>
      </div>)}
    </div>
    <div className="rounded-2xl border border-[#eadfd8] bg-[#fffaf7] p-3 sm:p-4 flex flex-col lg:flex-row lg:items-center gap-3">
      <div className="flex items-center gap-2 min-w-0"><SquareCheckBig size={18} className="shrink-0 text-[#c66d48]"/><div><div className="text-sm font-bold">Работа с выбранными</div><div className="text-xs text-[#8f8782]">Выбрано: {selectedRows.length || "—"}. Если ничего не выделять, в печать попадёт весь текущий список.</div></div></div>
      <div className="lg:ml-auto flex flex-wrap gap-2 items-center">
        <select value={batchStatus} onChange={(e) => setBatchStatus(e.target.value)} disabled={batchSaving || !selectedRows.length} className="rounded-xl border border-[#e8ddd7] bg-white px-3 py-2 text-sm font-semibold disabled:opacity-50">{ORDER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <button onClick={() => void changeSelectedStatus()} disabled={batchSaving || !selectedRows.length} className="inline-flex items-center gap-2 rounded-xl bg-[#e8845a] px-3.5 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-45"><Send size={15}/>{batchSaving ? "Сохраняем…" : "Изменить статус"}</button>
        <span className="hidden sm:block h-7 w-px bg-[#eadfd8]"/>
        <button onClick={() => printDocument("assembly")} className="inline-flex items-center gap-2 rounded-xl border border-[#e2c7b9] bg-white px-3.5 py-2 text-sm font-semibold text-[#9d5638]"><ListChecks size={16}/>Лист сборки</button>
        <button onClick={() => printDocument("register")} className="inline-flex items-center gap-2 rounded-xl border border-[#e2c7b9] bg-white px-3.5 py-2 text-sm font-semibold text-[#9d5638]"><Printer size={16}/>Реестр</button>
      </div>
    </div>
    <div className="bg-white border border-[#eee4de] rounded-2xl p-4 flex flex-wrap items-end gap-3">
      <label className="text-xs font-semibold text-[#756c67]">С даты<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="block mt-1 border border-[#e8ddd7] rounded-lg px-3 py-2 text-sm"/></label>
      <label className="text-xs font-semibold text-[#756c67]">По дату<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="block mt-1 border border-[#e8ddd7] rounded-lg px-3 py-2 text-sm"/></label>
      <button onClick={() => quickRange(1)} className="px-3 py-2 rounded-lg bg-[#fff4ee] text-[#b9633f] text-sm font-semibold">Сегодня</button>
      <button onClick={() => quickRange(7)} className="px-3 py-2 rounded-lg bg-[#fff4ee] text-[#b9633f] text-sm font-semibold">7 дней</button>
      <div className="relative min-w-[240px] flex-1"><Search size={16} className="absolute left-3 top-3 text-[#aaa]"/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Заказ, имя, телефон, адрес…" className="w-full border border-[#e8ddd7] rounded-lg pl-9 pr-3 py-2 text-sm"/></div>
      <label className="flex items-center gap-2 text-sm font-medium"><input type="checkbox" checked={onlyIncomplete} onChange={(e) => setOnlyIncomplete(e.target.checked)} className="accent-[#E8845A]"/>Только незавершённые</label>
    </div>
    {error && <p className="rounded-xl bg-red-50 text-red-600 px-4 py-3 text-sm">{error}</p>}
    {statusMessage && <p className="rounded-xl bg-green-50 text-green-700 px-4 py-3 text-sm">{statusMessage}</p>}
    <div ref={tableRef} onScroll={rememberView} className="border border-[#eadfd8] rounded-2xl bg-white overflow-auto max-h-[72vh] [scrollbar-gutter:stable]">
      <table className="min-w-[1855px] w-full text-[12px] border-collapse table-fixed">
        <colgroup>
          <col style={{ width: 38 }}/>
          <col style={{ width: 44 }}/>
          <col style={{ width: 150 }}/>
          <col style={{ width: 165 }}/>
          <col style={{ width: 185 }}/>
          <col style={{ width: 82 }}/>
          <col style={{ width: 220 }}/>
          <col style={{ width: 86 }}/>
          <col style={{ width: 88 }}/>
          <col style={{ width: 145 }}/>
          {checks.map(([key]) => <col key={key} style={{ width: 52 }}/>) }
          <col style={{ width: 165 }}/>
          <col style={{ width: 180 }}/>
          <col style={{ width: 90 }}/>
        </colgroup>
        <thead className="sticky top-0 z-20 bg-[#faf6f3] text-[#706762]"><tr>
          <th className="sticky left-0 z-30 bg-[#faf6f3] w-10 text-center px-1 py-3 border-b border-r border-[#eadfd8]"><input type="checkbox" aria-label="Выбрать все показанные заказы" checked={visible.length > 0 && visible.every((row) => selectedIds.includes(row.id))} onChange={toggleAllVisible} className="accent-[#E8845A]"/></th>
          <th className="sticky left-[38px] z-30 bg-[#faf6f3] w-11 text-center px-2 py-3 border-b border-r border-[#eadfd8] font-semibold">№</th>
          {['Дата / заказ','Покупатель','Товары','Сумма заказа','Доставка / адрес','Доставка клиенту','Доставка факт','ПВЗ отправки',...checks.map(([,label]) => label),'Статус заказа','Комментарий','Последнее изменение'].map((label, index) => <th key={label} className={`${index >= 8 && index <= 11 ? "text-center px-1" : "text-left px-2.5"} py-3 border-b border-r border-[#eadfd8] leading-tight font-semibold`}>
            {label === "Статус заказа" ? <button type="button" onClick={toggleStatusSort} title="Сортировать по статусу" className="inline-flex items-center gap-1.5 hover:text-[#c66d48] transition-colors">
              <span>{label}</span>{statusSort === "asc" ? <ArrowUp size={14}/> : statusSort === "desc" ? <ArrowDown size={14}/> : <ArrowUpDown size={14}/>}
            </button> : label}
          </th>)}
        </tr></thead>
        <tbody>{visible.map((row, index) => <tr key={row.id} className="group align-top hover:bg-[#fffdfb]">
          <td className="sticky left-0 z-10 bg-white group-hover:bg-[#fffdfb] px-1 py-3 border-b border-r border-[#eee7e2] text-center"><input type="checkbox" aria-label={`Выбрать заказ ${row.id}`} checked={selectedIds.includes(row.id)} onChange={() => toggleSelected(row.id)} className="accent-[#E8845A]"/></td>
          <td className="sticky left-[38px] z-10 bg-white group-hover:bg-[#fffdfb] px-2 py-3 border-b border-r border-[#eee7e2] text-center font-bold tabular-nums text-[#8f8782]">{index + 1}</td>
          <td className="px-2.5 py-3 border-b border-r border-[#eee7e2] w-[175px]">
            <div>{new Date(row.createdAt).toLocaleDateString("ru-RU")}</div>
            <div className="mt-1.5 flex items-start gap-1.5">
              <span className="min-w-0 font-mono text-[11px] leading-[1.35] font-bold text-[#c66d48]">
                {copiedOrder === row.id ? <span className="font-sans text-green-600">Скопировано</span> : <>{row.id.slice(0, row.id.lastIndexOf("-"))}<br/>{row.id.slice(row.id.lastIndexOf("-") + 1)}</>}
              </span>
              <button onClick={() => void copyOrder(row.id)} title="Скопировать номер заказа" aria-label={`Скопировать номер заказа ${row.id}`} className="shrink-0 inline-flex w-6 h-6 items-center justify-center rounded-md border border-[#eadfd8] bg-white text-[#c66d48] hover:bg-[#fff0e8] hover:border-[#e7b49e] transition-colors">
                <Clipboard size={12}/>
              </button>
            </div>
          </td>
          <td className="px-2.5 py-3 border-b border-r border-[#eee7e2] w-[180px]"><b>{row.customerName}</b><div className="text-[#837a75] mt-1 whitespace-nowrap">{row.phone}</div><div className="text-[#aaa] break-all">{row.email}</div></td>
          <td className="px-2.5 py-3 border-b border-r border-[#eee7e2] w-[205px]">{row.items.map((item) => <div key={item.id} className="mb-2 leading-snug"><div>{item.name} <b>×{item.quantity}</b></div>{item.allocations.map((allocation, allocationIndex) => <div key={`${allocation.batchId || "none"}:${allocationIndex}`} className={`mt-0.5 text-[10px] font-semibold ${allocation.batchId ? "text-[#7d746f]" : "text-red-600"}`}>{allocation.batchId ? `Партия ${allocation.lotNumber}: ${allocation.quantity}` : `Не распределено: ${allocation.quantity}`}</div>)}</div>)}</td>
          <td className="px-2.5 py-3 border-b border-r border-[#eee7e2] w-[105px] font-extrabold whitespace-nowrap tabular-nums">{money(row.total)}</td>
          <td className="px-2.5 py-3 border-b border-r border-[#eee7e2] w-[235px]"><b>{row.deliveryMethod}</b><button onClick={() => navigator.clipboard.writeText(row.deliveryAddress)} className="block text-left mt-1 text-[#756c67] hover:text-[#c66d48] leading-snug">{row.deliveryAddress || "Адрес не указан"}</button>{row.trackNumber && <div className="mt-1 font-mono">{row.trackNumber}</div>}</td>
          <td className="px-3 py-3 border-b border-r border-[#eee7e2] font-bold whitespace-nowrap">{money(row.customerDeliveryCost)}</td>
          <td className="px-2 py-2 border-b border-r border-[#eee7e2] w-[95px]"><input type="number" min="0" value={row.warehouse.actualDeliveryCost ?? ""} onFocus={() => { editingRef.current = true; }} onChange={(e) => { const value = e.target.value === "" ? null : Number(e.target.value); updateLocal(row.id, { actualDeliveryCost: value }); scheduleSave(row.id, "actualDeliveryCost", value); }} onBlur={() => { editingRef.current = false; }} className="w-full border border-[#e8ddd7] rounded-lg px-2 py-2" placeholder="0"/></td>
          <td className="px-2 py-2 border-b border-r border-[#eee7e2] w-[155px]"><input value={row.warehouse.dispatchPoint} onFocus={() => { editingRef.current = true; }} onChange={(e) => { updateLocal(row.id, { dispatchPoint: e.target.value }); scheduleSave(row.id, "dispatchPoint", e.target.value); }} onBlur={() => { editingRef.current = false; }} className="w-full border border-[#e8ddd7] rounded-lg px-2 py-2" placeholder="Откуда отправили"/></td>
          {checks.map(([key, label]) => <td key={key} className="px-3 py-3 border-b border-r border-[#eee7e2] text-center"><button title={label} onClick={() => toggle(row, key)} className={`w-7 h-7 rounded-lg inline-flex items-center justify-center border ${row.warehouse[key] ? "bg-green-100 border-green-200 text-green-700" : "bg-white border-[#dfd5cf] text-transparent"}`}><Check size={16}/></button></td>)}
          <td className="px-2 py-2 border-b border-r border-[#eee7e2] w-[185px]"><select aria-label={`Статус заказа ${row.id}`} value={row.orderStatus} disabled={statusSaving === row.id} onChange={(e) => changeOrderStatus(row, e.target.value)} className={`w-full rounded-lg border px-2 py-2 text-xs font-semibold ${STATUS_STYLE[row.orderStatus] || "bg-gray-50 text-gray-700 border-gray-200"}`}>{ORDER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{statusSaving === row.id && <div className="mt-1 text-[11px] text-[#999]">Сохраняем и отправляем письмо…</div>}</td>
          <td className="px-2 py-2 border-b border-r border-[#eee7e2] w-[210px]"><textarea value={row.warehouse.internalComment} onFocus={() => { editingRef.current = true; }} onChange={(e) => { updateLocal(row.id, { internalComment: e.target.value }); scheduleSave(row.id, "internalComment", e.target.value, 850); }} onBlur={() => { editingRef.current = false; }} rows={2} className="w-full resize-none border border-[#e8ddd7] rounded-lg px-2 py-2" placeholder="Внутренний комментарий"/></td>
          <td className="px-3 py-3 border-b border-[#eee7e2] w-[90px] text-center">{saving === row.id ? <span className="text-[#aaa]">Сохраняем…</span> : saved === row.id ? <span className="text-green-600 font-semibold">Сохранено</span> : row.warehouse.updatedAt ? <span className="text-[#aaa]">{new Date(row.warehouse.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span> : "—"}</td>
        </tr>)}</tbody>
      </table>
      {!loading && !visible.length && <div className="p-10 text-center text-[#999]">За выбранный период оплаченных заказов нет.</div>}
    </div>
    <p className="text-xs text-[#999]">Показано: {visible.length} из {rows.length}. Номер заказа копируется одним нажатием. Положение таблицы и выбранные даты сохраняются при переходе между вкладками.</p>
  </section>;
}
