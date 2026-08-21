"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Boxes, Check, ChevronDown, ChevronRight,
  ClipboardCheck, History, LoaderCircle, Pencil, Plus, RefreshCw, Search, ShieldAlert, X,
} from "lucide-react";

type Product = { id: string; name: string; category: string; stockQty: number | null; inStock: boolean };
type Batch = {
  id: string; product_id: string; lot_number: string; manufactured_at: string | null; received_at: string; expires_at: string | null;
  received_quantity: number; remaining_quantity: number; status: "active" | "quarantined" | "depleted";
  production_cost_kopecks: number; notes: string | null; created_at: string; updated_at: string;
};
type Movement = {
  id: string; batch_id: string | null; product_id: string; order_id: string | null;
  kind: string; quantity: number; reason: string | null; created_at: string;
};
type Allocation = {
  id: string; order_id: string; product_id: string; batch_id: string | null;
  quantity: number; status: string; created_at: string; updated_at: string;
};
type InventoryOrder = {
  id: string; createdAt: string; customerName: string; orderStatus: string;
  items: Array<{ productId: string; name: string; quantity: number; stockAmount: number }>;
};
type InventoryPayload = {
  products: Product[]; batches: Batch[]; movements: Movement[];
  allocations: Allocation[]; orders: InventoryOrder[];
};
type InventoryTab = "batches" | "orders" | "movements";
type AllocationDraft = { batchId: string; quantity: string };
type BatchForm = { lotNumber: string; manufacturedAt: string; receivedAt: string; expiresAt: string; notes: string; productionCost: string };

const MOVEMENT_LABELS: Record<string, string> = {
  opening: "Стартовый остаток", receipt: "Приёмка", sale: "Продажа",
  sale_unallocated: "Не распределено", return: "Возврат", writeoff: "Списание",
  adjustment: "Корректировка", reassignment: "Смена партии",
};
const STATUS_LABELS: Record<string, string> = {
  active: "Активна", quarantined: "Карантин", depleted: "Закончилась",
};
const ORDER_STATUS_LABELS: Record<string, string> = {
  processing: "Новый", confirmed: "На сборке", shipped: "Передан в доставку",
  delivered: "Завершён", cancelled: "Отменён",
};
const date = (value: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString("ru-RU") : "Не указана";
const dateTime = (value: string) => new Date(value).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
const number = (value: number) => value.toLocaleString("ru-RU");
const unit = (product?: Product) => product?.category === "seeds" ? "г" : "шт.";
const today = () => new Date().toLocaleDateString("sv-SE");

export default function InventoryWorkspace({ password }: { password: string }) {
  const [data, setData] = useState<InventoryPayload>({ products: [], batches: [], movements: [], allocations: [], orders: [] });
  const [tab, setTab] = useState<InventoryTab>("batches");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showReceipt, setShowReceipt] = useState(false);
  const [receipt, setReceipt] = useState({ productId: "", lotNumber: "", quantity: "", manufacturedAt: "", receivedAt: today(), expiresAt: "", notes: "", productionCost: "" });
  const [editing, setEditing] = useState<Batch | null>(null);
  const [batchForm, setBatchForm] = useState<BatchForm>({ lotNumber: "", manufacturedAt: "", receivedAt: today(), expiresAt: "", notes: "", productionCost: "" });
  const [adjusting, setAdjusting] = useState<Batch | null>(null);
  const [adjustment, setAdjustment] = useState({ remaining: "", reason: "" });
  const [reassigning, setReassigning] = useState<{ order: InventoryOrder; productId: string; required: number } | null>(null);
  const [allocationDrafts, setAllocationDrafts] = useState<AllocationDraft[]>([]);
  const [referenceTime] = useState(() => Date.now());

  const load = async (quiet = false) => {
    if (!quiet) setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/admin/inventory", { headers: { "x-admin-password": password }, cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Не удалось загрузить склад");
      setData(payload as InventoryPayload);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось загрузить склад");
    } finally { if (!quiet) setLoading(false); }
  };
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const productById = useMemo(() => new Map(data.products.map((product) => [product.id, product])), [data.products]);
  const batchById = useMemo(() => new Map(data.batches.map((batch) => [batch.id, batch])), [data.batches]);
  const inventoryStartedAt = useMemo(() => {
    const first = [...data.movements].sort((a, b) => a.created_at.localeCompare(b.created_at))[0];
    return first?.created_at ? new Date(first.created_at).getTime() : Number.POSITIVE_INFINITY;
  }, [data.movements]);
  const expiringLimit = referenceTime + 90 * 24 * 60 * 60 * 1000;
  const expiring = data.batches.filter((batch) => batch.status === "active" && batch.remaining_quantity > 0 && batch.expires_at && new Date(`${batch.expires_at}T23:59:59`).getTime() <= expiringLimit);
  const lowStock = data.products.filter((product) => product.stockQty !== null && product.stockQty <= (product.category === "seeds" ? 500 : 5));
  const unallocated = data.allocations.filter((allocation) => allocation.batch_id === null);

  const batchesByProduct = useMemo(() => {
    const grouped = new Map<string, Batch[]>();
    for (const batch of data.batches) grouped.set(batch.product_id, [...(grouped.get(batch.product_id) || []), batch]);
    return grouped;
  }, [data.batches]);
  const visibleProducts = data.products.filter((product) => product.name.toLowerCase().includes(search.trim().toLowerCase()));

  const post = async (body: Record<string, unknown>, success: string) => {
    setSaving(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/inventory", {
        method: "POST", headers: { "content-type": "application/json", "x-admin-password": password },
        body: JSON.stringify(body),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "Не удалось сохранить");
      setMessage(success);
      await load(true);
      return true;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось сохранить");
      return false;
    } finally { setSaving(false); }
  };

  const receive = async () => {
    const ok = await post({
      action: "receive", productId: receipt.productId, lotNumber: receipt.lotNumber,
      quantity: Number(receipt.quantity), manufacturedAt: receipt.manufacturedAt || null,
      receivedAt: receipt.receivedAt, expiresAt: receipt.expiresAt || null, notes: receipt.notes,
      productionCostKopecks: Math.round(Number(receipt.productionCost || 0) * 100),
    }, "Партия принята, остаток товара обновлён.");
    if (ok) {
      setShowReceipt(false);
      setReceipt({ productId: "", lotNumber: "", quantity: "", manufacturedAt: "", receivedAt: today(), expiresAt: "", notes: "", productionCost: "" });
    }
  };
  const openEdit = (batch: Batch) => {
    setEditing(batch);
    setBatchForm({
      lotNumber: batch.lot_number,
      manufacturedAt: batch.manufactured_at || "",
      receivedAt: batch.received_at || batch.created_at.slice(0, 10),
      expiresAt: batch.expires_at || "",
      notes: batch.notes || "",
      productionCost: String(Number(batch.production_cost_kopecks || 0) / 100),
    });
  };
  const saveBatch = async () => {
    if (!editing) return;
    const ok = await post({
      action: "editBatch", batchId: editing.id, lotNumber: batchForm.lotNumber,
      manufacturedAt: batchForm.manufacturedAt || null, receivedAt: batchForm.receivedAt,
      expiresAt: batchForm.expiresAt || null, notes: batchForm.notes,
      productionCostKopecks: Math.round(Number(batchForm.productionCost || 0) * 100),
    }, "Данные партии сохранены.");
    if (ok) setEditing(null);
  };
  const adjust = async () => {
    if (!adjusting) return;
    const ok = await post({ action: "adjust", batchId: adjusting.id, newRemaining: Number(adjustment.remaining), reason: adjustment.reason }, "Фактический остаток сохранён в истории движений.");
    if (ok) setAdjusting(null);
  };
  const setBatchStatus = async (batch: Batch, status: Batch["status"]) => {
    await post({ action: "batchStatus", batchId: batch.id, status }, status === "quarantined" ? "Партия помещена в карантин и исключена из доступного остатка." : "Статус партии обновлён.");
  };
  const openReassign = (order: InventoryOrder, productId: string, required: number) => {
    const current = data.allocations.filter((allocation) => allocation.order_id === order.id && allocation.product_id === productId);
    setReassigning({ order, productId, required });
    setAllocationDrafts(current.length
      ? current.map((allocation) => ({ batchId: allocation.batch_id || "", quantity: String(allocation.quantity) }))
      : [{ batchId: "", quantity: String(required) }]);
  };
  const saveReassignment = async () => {
    if (!reassigning) return;
    const ok = await post({
      action: "reassign", orderId: reassigning.order.id, productId: reassigning.productId,
      allocations: allocationDrafts.map((draft) => ({ batchId: draft.batchId || null, quantity: Number(draft.quantity) })),
    }, "Распределение заказа по партиям обновлено.");
    if (ok) setReassigning(null);
  };

  const orderRows = useMemo(() => data.orders.flatMap((order) => {
    const grouped = new Map<string, { name: string; required: number }>();
    for (const item of order.items) {
      if (!item.productId) continue;
      const previous = grouped.get(item.productId);
      grouped.set(item.productId, { name: previous?.name || item.name, required: (previous?.required || 0) + item.stockAmount });
    }
    return [...grouped].map(([productId, item]) => ({ order, productId, ...item }));
  }), [data.orders]);

  return <section className="space-y-5 min-w-0">
    <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-extrabold flex items-center gap-2"><Boxes size={23} className="text-[#E8845A]"/>Склад</h2>
        <p className="text-sm text-[#8f8782] mt-1">Партии, FIFO-списание, движения и инвентаризация в одной системе.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#eadfd8] bg-white text-sm font-semibold"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/>Обновить</button>
        <button onClick={() => setShowReceipt(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E8845A] text-white text-sm font-bold"><Plus size={16}/>Принять партию</button>
      </div>
    </div>

    <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
      {[
        ["Товаров на учёте", data.products.filter((product) => product.stockQty !== null).length, `${data.batches.length} партий`],
        ["Мало или закончилось", lowStock.length, "Нужна проверка остатков"],
        ["Срок до 90 дней", expiring.length, "Партии для приоритетной отгрузки"],
        ["Без партии", unallocated.length, "Позиции заказов для проверки"],
      ].map(([label, value, note]) => <div key={label} className="rounded-2xl border border-[#eee4de] bg-white p-4">
        <div className="text-xs font-semibold text-[#8b817b]">{label}</div><div className="mt-1 text-2xl font-extrabold tabular-nums">{value}</div><div className="text-[11px] text-[#aaa] mt-0.5">{note}</div>
      </div>)}
    </div>

    {(expiring.length > 0 || unallocated.length > 0) && <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
      <AlertTriangle size={17} className="mt-0.5 shrink-0"/><div><b>Есть позиции, требующие внимания.</b> {expiring.length ? `Скоро истекает партий: ${expiring.length}. ` : ""}{unallocated.length ? `Не распределено по партиям: ${unallocated.length}.` : ""}</div>
    </div>}
    {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {message && <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

    <div className="flex gap-1.5 overflow-x-auto rounded-2xl bg-[#f5f0ec] p-1.5 w-fit max-w-full">
      {([
        ["batches", "Остатки и партии", Boxes], ["orders", "Партии в заказах", ClipboardCheck], ["movements", "История движений", History],
      ] as const).map(([id, label, Icon]) => <button key={id} onClick={() => setTab(id)} className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap text-sm font-semibold ${tab === id ? "bg-white shadow-sm text-[#1a1a1a]" : "text-[#756c67]"}`}><Icon size={15}/>{label}</button>)}
    </div>

    {loading ? <div className="py-16 flex justify-center text-[#999]"><LoaderCircle className="animate-spin"/></div> : tab === "batches" ? <div className="space-y-3">
      <div className="relative max-w-md"><Search size={16} className="absolute left-3 top-3 text-[#aaa]"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Найти товар" className="w-full rounded-xl border border-[#eadfd8] bg-white pl-9 pr-3 py-2.5 text-sm"/></div>
      <div className="rounded-2xl border border-[#eadfd8] bg-white overflow-hidden">
        {visibleProducts.map((product) => {
          const batches = batchesByProduct.get(product.id) || [];
          const isExpanded = expanded.has(product.id);
          const warning = lowStock.some((item) => item.id === product.id);
          return <div key={product.id} className="border-b border-[#eee7e2] last:border-b-0">
            <button onClick={() => setExpanded((current) => { const next = new Set(current); if (next.has(product.id)) next.delete(product.id); else next.add(product.id); return next; })} className="w-full grid grid-cols-[24px_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3.5 text-left hover:bg-[#fffaf7]">
              {isExpanded ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}<div className="min-w-0"><b className="block truncate">{product.name}</b><span className="text-xs text-[#999]">{batches.length ? `${batches.length} парт.` : "Партий пока нет"}</span></div>
              {warning && <span title="Мало товара" className="text-amber-600"><AlertTriangle size={16}/></span>}
              <span className={`font-extrabold tabular-nums whitespace-nowrap ${warning ? "text-amber-700" : "text-green-700"}`}>{product.stockQty === null ? "Не задан" : `${number(product.stockQty)} ${unit(product)}`}</span>
            </button>
            {isExpanded && <div className="overflow-x-auto bg-[#fffdfb]"><table className="w-full min-w-[1040px] text-xs"><thead className="text-[#756c67]"><tr>{["Партия","Произведено","Принята","Годен до","Количество","Остаток","Статус","Примечание","Действия"].map((label) => <th key={label} className="text-left px-4 py-2 border-t border-b border-[#eee7e2] bg-[#faf6f3]">{label}</th>)}</tr></thead>
              <tbody>{batches.map((batch) => {
                const expiresSoon = Boolean(batch.expires_at && new Date(`${batch.expires_at}T23:59:59`).getTime() <= expiringLimit && batch.remaining_quantity > 0);
                return <tr key={batch.id}><td className="px-4 py-3 font-mono font-bold">{batch.lot_number}</td><td className="px-4 py-3">{date(batch.manufactured_at)}</td><td className="px-4 py-3">{date(batch.received_at)}</td><td className={`px-4 py-3 ${expiresSoon ? "font-bold text-amber-700" : ""}`}>{date(batch.expires_at)}</td><td className="px-4 py-3 tabular-nums">{number(batch.received_quantity)} {unit(product)}</td><td className="px-4 py-3 font-extrabold tabular-nums">{number(batch.remaining_quantity)} {unit(product)}</td><td className="px-4 py-3"><span className={`px-2 py-1 rounded-lg font-semibold ${batch.status === "active" ? "bg-green-50 text-green-700" : batch.status === "quarantined" ? "bg-red-50 text-red-700" : "bg-gray-100 text-gray-600"}`}>{STATUS_LABELS[batch.status]}</span></td><td className="px-4 py-3 max-w-[260px] text-[#837a75]">{batch.notes || ""}</td><td className="px-4 py-3"><div className="flex gap-1.5"><button onClick={() => openEdit(batch)} className="p-1.5 rounded-lg border border-[#eadfd8] bg-white text-[#756c67]" title="Редактировать данные партии"><Pencil size={15}/></button><button onClick={() => { setAdjusting(batch); setAdjustment({ remaining: String(batch.remaining_quantity), reason: "" }); }} className="px-2.5 py-1.5 rounded-lg border border-[#eadfd8] bg-white font-semibold">Инвентаризация</button><button onClick={() => void setBatchStatus(batch, batch.status === "quarantined" ? "active" : "quarantined")} className={`p-1.5 rounded-lg border ${batch.status === "quarantined" ? "border-green-200 text-green-700" : "border-red-200 text-red-600"}`} title={batch.status === "quarantined" ? "Вернуть в активные" : "Поместить в карантин"}>{batch.status === "quarantined" ? <Check size={15}/> : <ShieldAlert size={15}/>}</button></div></td></tr>;
              })}</tbody></table>{!batches.length && <div className="px-12 py-6 text-sm text-[#999]">Добавьте первую партию через кнопку «Принять партию».</div>}</div>}
          </div>;
        })}
      </div>
    </div> : tab === "orders" ? <div className="rounded-2xl border border-[#eadfd8] bg-white overflow-auto max-h-[70vh]">
      <table className="w-full min-w-[1020px] text-xs"><thead className="sticky top-0 bg-[#faf6f3] z-10"><tr>{["Дата / заказ","Покупатель","Товар","Нужно списать","Распределение FIFO","Статус","Действие"].map((label) => <th key={label} className="text-left px-4 py-3 border-b border-[#eadfd8]">{label}</th>)}</tr></thead><tbody>{orderRows.map(({ order, productId, name, required }) => {
        const allocations = data.allocations.filter((allocation) => allocation.order_id === order.id && allocation.product_id === productId);
        const legacy = new Date(order.createdAt).getTime() < inventoryStartedAt;
        return <tr key={`${order.id}:${productId}`} className="align-top"><td className="px-4 py-3 border-b border-[#eee7e2]"><div>{new Date(order.createdAt).toLocaleDateString("ru-RU")}</div><div className="font-mono text-[#c66d48] font-bold mt-1">{order.id}</div></td><td className="px-4 py-3 border-b border-[#eee7e2] font-semibold">{order.customerName}</td><td className="px-4 py-3 border-b border-[#eee7e2]">{name}</td><td className="px-4 py-3 border-b border-[#eee7e2] font-bold">{number(required)} {unit(productById.get(productId))}</td><td className="px-4 py-3 border-b border-[#eee7e2]">{allocations.length ? allocations.map((allocation) => <div key={allocation.id} className={allocation.batch_id ? "" : "text-red-600 font-semibold"}>{allocation.batch_id ? `${batchById.get(allocation.batch_id)?.lot_number || "Партия"}: ${number(allocation.quantity)}` : `Без партии: ${number(allocation.quantity)}`} {unit(productById.get(productId))}</div>) : <span className="text-[#999]">{legacy ? "Заказ до включения партий" : "Нет распределения"}</span>}</td><td className="px-4 py-3 border-b border-[#eee7e2]">{ORDER_STATUS_LABELS[order.orderStatus] || order.orderStatus}</td><td className="px-4 py-3 border-b border-[#eee7e2]"><button disabled={legacy || order.orderStatus === "cancelled"} onClick={() => openReassign(order, productId, required)} className="px-3 py-1.5 rounded-lg border border-[#eadfd8] bg-white font-semibold disabled:opacity-40">Изменить партии</button></td></tr>;
      })}</tbody></table>{!orderRows.length && <div className="p-10 text-center text-[#999]">Оплаченных заказов пока нет.</div>}
    </div> : <div className="rounded-2xl border border-[#eadfd8] bg-white overflow-auto max-h-[70vh]">
      <table className="w-full min-w-[920px] text-xs"><thead className="sticky top-0 bg-[#faf6f3] z-10"><tr>{["Дата","Товар","Партия","Операция","Изменение","Заказ","Причина"].map((label) => <th key={label} className="text-left px-4 py-3 border-b border-[#eadfd8]">{label}</th>)}</tr></thead><tbody>{data.movements.map((movement) => <tr key={movement.id}><td className="px-4 py-3 border-b border-[#eee7e2] whitespace-nowrap">{dateTime(movement.created_at)}</td><td className="px-4 py-3 border-b border-[#eee7e2] font-semibold">{productById.get(movement.product_id)?.name || movement.product_id}</td><td className="px-4 py-3 border-b border-[#eee7e2] font-mono">{movement.batch_id ? batchById.get(movement.batch_id)?.lot_number || "Удалена" : "Без партии"}</td><td className="px-4 py-3 border-b border-[#eee7e2]">{MOVEMENT_LABELS[movement.kind] || movement.kind}</td><td className={`px-4 py-3 border-b border-[#eee7e2] font-extrabold tabular-nums ${movement.quantity > 0 ? "text-green-700" : "text-red-600"}`}>{movement.quantity > 0 ? "+" : ""}{number(movement.quantity)} {unit(productById.get(movement.product_id))}</td><td className="px-4 py-3 border-b border-[#eee7e2] font-mono">{movement.order_id || ""}</td><td className="px-4 py-3 border-b border-[#eee7e2] text-[#756c67]">{movement.reason || ""}</td></tr>)}</tbody></table>
    </div>}

    {showReceipt && <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setShowReceipt(false); }}><div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"><div className="px-6 py-4 border-b border-[#eee7e2] flex justify-between"><div><h3 className="font-extrabold">Приёмка партии</h3><p className="text-xs text-[#999] mt-1">После сохранения общий остаток товара обновится автоматически.</p></div><button onClick={() => setShowReceipt(false)}><X size={20}/></button></div><div className="p-6 grid sm:grid-cols-2 gap-4">
      <label className="sm:col-span-2 text-xs font-semibold text-[#756c67]">Товар<select value={receipt.productId} onChange={(event) => setReceipt({ ...receipt, productId: event.target.value })} className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm bg-white"><option value="">Выберите товар</option>{data.products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>
      <label className="text-xs font-semibold text-[#756c67]">Номер партии<input value={receipt.lotNumber} onChange={(event) => setReceipt({ ...receipt, lotNumber: event.target.value })} className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm"/></label>
      <label className="text-xs font-semibold text-[#756c67]">Количество<input type="number" min="1" value={receipt.quantity} onChange={(event) => setReceipt({ ...receipt, quantity: event.target.value })} className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm"/></label>
      <label className="text-xs font-semibold text-[#756c67]">Стоимость партии, ₽<input type="number" min="0" step="0.01" value={receipt.productionCost} onChange={(event) => setReceipt({ ...receipt, productionCost: event.target.value })} placeholder="Например, 18500" className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm"/></label>
      <label className="text-xs font-semibold text-[#756c67]">Дата производства<input type="date" value={receipt.manufacturedAt} onChange={(event) => setReceipt({ ...receipt, manufacturedAt: event.target.value })} className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm"/></label>
      <label className="text-xs font-semibold text-[#756c67]">Дата приёмки<input type="date" value={receipt.receivedAt} onChange={(event) => setReceipt({ ...receipt, receivedAt: event.target.value })} className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm"/></label>
      <label className="text-xs font-semibold text-[#756c67]">Годен до<input type="date" value={receipt.expiresAt} onChange={(event) => setReceipt({ ...receipt, expiresAt: event.target.value })} className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm"/></label>
      <label className="sm:col-span-2 text-xs font-semibold text-[#756c67]">Комментарий<textarea value={receipt.notes} onChange={(event) => setReceipt({ ...receipt, notes: event.target.value })} rows={3} className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm resize-none"/></label>
    </div><div className="px-6 py-4 border-t border-[#eee7e2] flex justify-end gap-2"><button onClick={() => setShowReceipt(false)} className="px-4 py-2 rounded-xl border border-[#eadfd8]">Отмена</button><button onClick={() => void receive()} disabled={saving} className="px-4 py-2 rounded-xl bg-[#E8845A] text-white font-bold disabled:opacity-50 inline-flex items-center gap-2">{saving && <LoaderCircle size={15} className="animate-spin"/>}Принять</button></div></div></div>}

    {editing && <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4" onMouseDown={(event) => { if (event.currentTarget === event.target) setEditing(null); }}><div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden"><div className="px-6 py-4 border-b border-[#eee7e2] flex justify-between gap-3"><div><h3 className="font-extrabold">Редактировать партию</h3><p className="text-xs text-[#999] mt-1">Количество и остаток меняются отдельно через инвентаризацию.</p></div><button onClick={() => setEditing(null)} aria-label="Закрыть"><X size={20}/></button></div><div className="p-6 grid sm:grid-cols-2 gap-4">
      <label className="sm:col-span-2 text-xs font-semibold text-[#756c67]">Номер партии<input value={batchForm.lotNumber} onChange={(event) => setBatchForm({ ...batchForm, lotNumber: event.target.value })} className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm"/></label>
      <label className="text-xs font-semibold text-[#756c67]">Дата производства<input type="date" value={batchForm.manufacturedAt} onChange={(event) => setBatchForm({ ...batchForm, manufacturedAt: event.target.value })} className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm"/></label>
      <label className="text-xs font-semibold text-[#756c67]">Дата приёмки<input type="date" value={batchForm.receivedAt} onChange={(event) => setBatchForm({ ...batchForm, receivedAt: event.target.value })} className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm"/></label>
      <label className="text-xs font-semibold text-[#756c67]">Стоимость партии, ₽<input type="number" min="0" step="0.01" value={batchForm.productionCost} onChange={(event) => setBatchForm({ ...batchForm, productionCost: event.target.value })} className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm"/></label>
      <label className="text-xs font-semibold text-[#756c67]">Годен до<input type="date" value={batchForm.expiresAt} onChange={(event) => setBatchForm({ ...batchForm, expiresAt: event.target.value })} className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm"/></label>
      <label className="sm:col-span-2 text-xs font-semibold text-[#756c67]">Комментарий<textarea value={batchForm.notes} onChange={(event) => setBatchForm({ ...batchForm, notes: event.target.value })} rows={3} placeholder="Например: документы проверены" className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm resize-none"/></label>
    </div><div className="px-6 py-4 border-t border-[#eee7e2] flex justify-end gap-2"><button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl border border-[#eadfd8]">Отмена</button><button onClick={() => void saveBatch()} disabled={saving || !batchForm.lotNumber.trim() || !batchForm.receivedAt} className="px-4 py-2 rounded-xl bg-[#E8845A] text-white font-bold disabled:opacity-50 inline-flex items-center gap-2">{saving && <LoaderCircle size={15} className="animate-spin"/>}Сохранить изменения</button></div></div></div>}

    {adjusting && <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4"><div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6"><div className="flex justify-between gap-3"><div><h3 className="font-extrabold">Инвентаризация партии</h3><p className="text-sm text-[#756c67] mt-1">{adjusting.lot_number}</p></div><button onClick={() => setAdjusting(null)}><X size={20}/></button></div><label className="block mt-5 text-xs font-semibold text-[#756c67]">Фактический остаток<input type="number" min="0" value={adjustment.remaining} onChange={(event) => setAdjustment({ ...adjustment, remaining: event.target.value })} className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm"/></label><label className="block mt-4 text-xs font-semibold text-[#756c67]">Причина корректировки<textarea value={adjustment.reason} onChange={(event) => setAdjustment({ ...adjustment, reason: event.target.value })} rows={3} placeholder="Например: пересчёт 20 августа" className="block w-full mt-1 rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm resize-none"/></label><div className="flex justify-end gap-2 mt-5"><button onClick={() => setAdjusting(null)} className="px-4 py-2 rounded-xl border border-[#eadfd8]">Отмена</button><button onClick={() => void adjust()} disabled={saving} className="px-4 py-2 rounded-xl bg-[#E8845A] text-white font-bold disabled:opacity-50">Сохранить</button></div></div></div>}

    {reassigning && <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4"><div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"><div className="px-6 py-4 border-b border-[#eee7e2] flex justify-between"><div><h3 className="font-extrabold">Партии заказа {reassigning.order.id}</h3><p className="text-xs text-[#999] mt-1">Нужно распределить: {number(reassigning.required)} {unit(productById.get(reassigning.productId))}. Сумма строк должна совпасть.</p></div><button onClick={() => setReassigning(null)}><X size={20}/></button></div><div className="p-6 space-y-3">{allocationDrafts.map((draft, index) => <div key={index} className="grid grid-cols-[minmax(0,1fr)_120px_36px] gap-2"><select value={draft.batchId} onChange={(event) => setAllocationDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, batchId: event.target.value } : item))} className="rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm bg-white"><option value="">Без партии</option>{(batchesByProduct.get(reassigning.productId) || []).filter((batch) => batch.status === "active" || batch.id === draft.batchId).map((batch) => <option key={batch.id} value={batch.id}>{batch.lot_number} · доступно {number(batch.remaining_quantity)}</option>)}</select><input type="number" min="1" value={draft.quantity} onChange={(event) => setAllocationDrafts((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: event.target.value } : item))} className="rounded-xl border border-[#eadfd8] px-3 py-2.5 text-sm"/><button onClick={() => setAllocationDrafts((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="rounded-xl border border-red-100 text-red-500"><X size={15} className="mx-auto"/></button></div>)}<button onClick={() => setAllocationDrafts((current) => [...current, { batchId: "", quantity: "" }])} className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#c66d48]"><Plus size={15}/>Добавить строку</button></div><div className="px-6 py-4 border-t border-[#eee7e2] flex items-center justify-between"><div className={`text-sm font-bold ${allocationDrafts.reduce((sum, item) => sum + Number(item.quantity || 0), 0) === reassigning.required ? "text-green-700" : "text-red-600"}`}>Распределено: {number(allocationDrafts.reduce((sum, item) => sum + Number(item.quantity || 0), 0))} из {number(reassigning.required)}</div><div className="flex gap-2"><button onClick={() => setReassigning(null)} className="px-4 py-2 rounded-xl border border-[#eadfd8]">Отмена</button><button onClick={() => void saveReassignment()} disabled={saving} className="px-4 py-2 rounded-xl bg-[#E8845A] text-white font-bold disabled:opacity-50">Сохранить партии</button></div></div></div></div>}
  </section>;
}
