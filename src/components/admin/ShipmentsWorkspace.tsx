"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, RefreshCw, Search } from "lucide-react";

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
  items: Array<{ id: string; name: string; quantity: number }>; itemsCount: number; total: number;
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

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" });
const money = (value: number) => `${value.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} ₽`;

export default function ShipmentsWorkspace({ password }: { password: string }) {
  const [rows, setRows] = useState<Shipment[]>([]);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [search, setSearch] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch(`/api/admin/shipments?from=${from}&to=${to}`, { headers: { "x-admin-password": password }, cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось загрузить отгрузки");
      setRows(data.shipments || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось загрузить отгрузки"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [from, to]); // eslint-disable-line react-hooks/exhaustive-deps

  const visible = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const matches = !q || [row.id, row.customerName, row.email, row.phone, row.deliveryAddress]
      .some((value) => value.toLowerCase().includes(q));
    const w = row.warehouse;
    const incomplete = !w.orderChecked || !w.assembled || !w.fiscalReceiptDone || !w.honestSignDone;
    return matches && (!onlyIncomplete || incomplete);
  }), [rows, search, onlyIncomplete]);

  const updateLocal = (id: string, changes: Partial<Warehouse>) => setRows((current) => current.map((row) =>
    row.id === id ? { ...row, warehouse: { ...row.warehouse, ...changes } } : row));
  const save = async (id: string, changes: Partial<Warehouse>) => {
    setSaving(id); setSaved(null); setError("");
    try {
      const response = await fetch("/api/admin/shipments", {
        method: "PATCH", headers: { "content-type": "application/json", "x-admin-password": password },
        body: JSON.stringify({ orderId: id, changes }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось сохранить");
      setSaved(id); window.setTimeout(() => setSaved((value) => value === id ? null : value), 1800);
    } catch (e) { setError(e instanceof Error ? e.message : "Не удалось сохранить"); await load(); }
    finally { setSaving(null); }
  };
  const toggle = (row: Shipment, key: keyof Warehouse) => {
    const value = !Boolean(row.warehouse[key]); updateLocal(row.id, { [key]: value }); save(row.id, { [key]: value });
  };
  const changeOrderStatus = async (row: Shipment, orderStatus: string) => {
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
      if (data.email === "failed") setStatusMessage(`Статус заказа ${row.id} сохранён, но письмо покупателю не отправилось.`);
      else if (data.email === "sent") setStatusMessage(`Статус заказа ${row.id} сохранён, письмо покупателю отправлено.`);
      else setStatusMessage(`Статус заказа ${row.id} сохранён.`);
    } catch (e) {
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, orderStatus: previousStatus } : item));
      setError(e instanceof Error ? e.message : "Не удалось изменить статус");
    } finally { setStatusSaving(null); }
  };
  const quickRange = (days: number) => {
    const end = new Date(); const start = new Date(); start.setDate(end.getDate() - days + 1);
    setFrom(start.toLocaleDateString("sv-SE", { timeZone: "Europe/Moscow" })); setTo(today());
  };

  const checks: Array<[keyof Warehouse, string]> = [
    ["orderChecked", "Проверен"], ["assembled", "Собран"], ["fiscalReceiptDone", "Чек Ozon"],
    ["honestSignDone", "Честный знак"],
  ];

  return <section className="space-y-4">
    <div className="flex flex-col xl:flex-row xl:items-end gap-3 justify-between">
      <div><h2 className="text-xl font-bold">Отгрузки</h2><p className="text-sm text-[#8f8782] mt-1">Рабочая таблица оплаченных заказов. Все изменения сохраняются в заказе.</p></div>
      <button onClick={load} disabled={loading} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#eadfd8] bg-white font-semibold text-sm"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/>{loading ? "Загрузка…" : "Обновить"}</button>
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
    <div className="border border-[#eadfd8] rounded-2xl bg-white overflow-auto max-h-[68vh]">
      <table className="min-w-[2100px] w-full text-[13px] border-collapse">
        <thead className="sticky top-0 z-20 bg-[#faf6f3] text-[#706762]"><tr>
          {['Дата / заказ','Покупатель','Товары','Доставка / адрес','Доставка клиенту','Доставка факт','ПВЗ отправки',...checks.map(([,label]) => label),'Статус заказа','Комментарий','Последнее изменение'].map((label) => <th key={label} className="text-left px-3 py-3 border-b border-r border-[#eadfd8] whitespace-nowrap font-semibold">{label}</th>)}
        </tr></thead>
        <tbody>{visible.map((row) => <tr key={row.id} className="align-top hover:bg-[#fffdfb]">
          <td className="px-3 py-3 border-b border-r border-[#eee7e2] w-[175px]"><div>{new Date(row.createdAt).toLocaleDateString("ru-RU")}</div><button onClick={() => navigator.clipboard.writeText(row.id)} className="mt-1 inline-flex items-center gap-1 font-mono text-xs font-bold text-[#c66d48]"><Clipboard size={12}/>{row.id}</button></td>
          <td className="px-3 py-3 border-b border-r border-[#eee7e2] w-[190px]"><b>{row.customerName}</b><div className="text-[#837a75] mt-1">{row.phone}</div><div className="text-[#aaa] break-all">{row.email}</div></td>
          <td className="px-3 py-3 border-b border-r border-[#eee7e2] w-[240px]">{row.items.map((item) => <div key={item.id} className="mb-1">{item.name} <b>×{item.quantity}</b></div>)}</td>
          <td className="px-3 py-3 border-b border-r border-[#eee7e2] w-[300px]"><b>{row.deliveryMethod}</b><button onClick={() => navigator.clipboard.writeText(row.deliveryAddress)} className="block text-left mt-1 text-[#756c67] hover:text-[#c66d48]">{row.deliveryAddress || "Адрес не указан"}</button>{row.trackNumber && <div className="mt-1 font-mono">{row.trackNumber}</div>}</td>
          <td className="px-3 py-3 border-b border-r border-[#eee7e2] font-bold whitespace-nowrap">{money(row.customerDeliveryCost)}</td>
          <td className="px-2 py-2 border-b border-r border-[#eee7e2] w-[105px]"><input type="number" min="0" value={row.warehouse.actualDeliveryCost ?? ""} onChange={(e) => updateLocal(row.id, { actualDeliveryCost: e.target.value === "" ? null : Number(e.target.value) })} onBlur={() => save(row.id, { actualDeliveryCost: row.warehouse.actualDeliveryCost })} className="w-full border border-[#e8ddd7] rounded-lg px-2 py-2" placeholder="0"/></td>
          <td className="px-2 py-2 border-b border-r border-[#eee7e2] w-[190px]"><input value={row.warehouse.dispatchPoint} onChange={(e) => updateLocal(row.id, { dispatchPoint: e.target.value })} onBlur={() => save(row.id, { dispatchPoint: row.warehouse.dispatchPoint })} className="w-full border border-[#e8ddd7] rounded-lg px-2 py-2" placeholder="Откуда отправили"/></td>
          {checks.map(([key, label]) => <td key={key} className="px-3 py-3 border-b border-r border-[#eee7e2] text-center"><button title={label} onClick={() => toggle(row, key)} className={`w-7 h-7 rounded-lg inline-flex items-center justify-center border ${row.warehouse[key] ? "bg-green-100 border-green-200 text-green-700" : "bg-white border-[#dfd5cf] text-transparent"}`}><Check size={16}/></button></td>)}
          <td className="px-2 py-2 border-b border-r border-[#eee7e2] w-[185px]"><select aria-label={`Статус заказа ${row.id}`} value={row.orderStatus} disabled={statusSaving === row.id} onChange={(e) => changeOrderStatus(row, e.target.value)} className={`w-full rounded-lg border px-2 py-2 text-xs font-semibold ${STATUS_STYLE[row.orderStatus] || "bg-gray-50 text-gray-700 border-gray-200"}`}>{ORDER_STATUSES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>{statusSaving === row.id && <div className="mt-1 text-[11px] text-[#999]">Сохраняем и отправляем письмо…</div>}</td>
          <td className="px-2 py-2 border-b border-r border-[#eee7e2] w-[260px]"><textarea value={row.warehouse.internalComment} onChange={(e) => updateLocal(row.id, { internalComment: e.target.value })} onBlur={() => save(row.id, { internalComment: row.warehouse.internalComment })} rows={2} className="w-full resize-none border border-[#e8ddd7] rounded-lg px-2 py-2" placeholder="Внутренний комментарий"/></td>
          <td className="px-3 py-3 border-b border-[#eee7e2] w-[90px] text-center">{saving === row.id ? <span className="text-[#aaa]">Сохраняем…</span> : saved === row.id ? <span className="text-green-600 font-semibold">Сохранено</span> : row.warehouse.updatedAt ? <span className="text-[#aaa]">{new Date(row.warehouse.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span> : "—"}</td>
        </tr>)}</tbody>
      </table>
      {!loading && !visible.length && <div className="p-10 text-center text-[#999]">За выбранный период оплаченных заказов нет.</div>}
    </div>
    <p className="text-xs text-[#999]">Показано: {visible.length}. Горизонтальная прокрутка открывает все рабочие столбцы.</p>
  </section>;
}
