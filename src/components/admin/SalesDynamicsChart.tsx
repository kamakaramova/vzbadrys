"use client";

import { useMemo, useState } from "react";
import { ShoppingBag, TrendingUp } from "lucide-react";
import type { Order } from "@/store/authStore";

type Metric = "revenue" | "orders";
type Period = 7 | 14 | 30 | 90 | "custom";

const MOSCOW_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Moscow",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function dateKey(date: Date) {
  const parts = MOSCOW_DATE.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function parseDate(value: string) {
  return new Date(`${value}T12:00:00+03:00`);
}

function shiftDate(value: string, days: number) {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateKey(date);
}

function enumerateDays(from: string, to: string) {
  const days: string[] = [];
  for (let current = from; current <= to; current = shiftDate(current, 1)) days.push(current);
  return days;
}

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

function Comparison({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[#E8845A]">есть рост с нуля</span>;
  const positive = value >= 0;
  return (
    <span className={positive ? "text-green-600" : "text-red-500"}>
      {positive ? "+" : ""}{value}%
    </span>
  );
}

export default function SalesDynamicsChart({ orders }: { orders: Order[] }) {
  const today = dateKey(new Date());
  const [period, setPeriod] = useState<Period>(30);
  const [customFrom, setCustomFrom] = useState(shiftDate(today, -29));
  const [customTo, setCustomTo] = useState(today);
  const [metric, setMetric] = useState<Metric>("revenue");

  const range = useMemo(() => {
    const rawFrom = period === "custom" ? customFrom : shiftDate(today, -(period - 1));
    const rawTo = period === "custom" ? customTo : today;
    const from = rawFrom <= rawTo ? rawFrom : rawTo;
    const to = rawFrom <= rawTo ? rawTo : rawFrom;
    const days = enumerateDays(from, to);
    const previousTo = shiftDate(from, -1);
    const previousFrom = shiftDate(previousTo, -(days.length - 1));
    return { from, to, days, previousFrom, previousTo };
  }, [period, customFrom, customTo, today]);

  const stats = useMemo(() => {
    const current = new Map(range.days.map((day) => [day, { revenue: 0, orders: 0 }]));
    let previousRevenue = 0;
    let previousOrders = 0;

    orders.forEach((order) => {
      if (order.paymentStatus !== "paid") return;
      const paidDay = dateKey(new Date(order.paidAt || order.date));
      const day = current.get(paidDay);
      if (day) {
        day.revenue += order.total;
        day.orders += 1;
      } else if (paidDay >= range.previousFrom && paidDay <= range.previousTo) {
        previousRevenue += order.total;
        previousOrders += 1;
      }
    });

    const points = range.days.map((day) => ({ day, ...(current.get(day) ?? { revenue: 0, orders: 0 }) }));
    const revenue = points.reduce((sum, point) => sum + point.revenue, 0);
    const orderCount = points.reduce((sum, point) => sum + point.orders, 0);
    return { points, revenue, orderCount, previousRevenue, previousOrders };
  }, [orders, range]);

  const values = stats.points.map((point) => point[metric]);
  const maxValue = Math.max(1, ...values);
  const width = 1000;
  const height = 280;
  const left = 55;
  const right = 18;
  const top = 18;
  const bottom = 42;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const x = (index: number) => left + (stats.points.length <= 1 ? plotWidth / 2 : (index / (stats.points.length - 1)) * plotWidth);
  const y = (value: number) => top + plotHeight - (value / maxValue) * plotHeight;
  const path = stats.points.map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point[metric])}`).join(" ");
  const area = stats.points.length ? `${path} L${x(stats.points.length - 1)},${top + plotHeight} L${x(0)},${top + plotHeight} Z` : "";
  const labelEvery = Math.max(1, Math.ceil(stats.points.length / 6));
  const formatShortDate = (value: string) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(parseDate(value));
  const currentComparison = metric === "revenue"
    ? percentChange(stats.revenue, stats.previousRevenue)
    : percentChange(stats.orderCount, stats.previousOrders);

  return (
    <section className="bg-white rounded-3xl border border-[#f0e8e0] p-5 sm:p-6">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5 mb-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#E8845A] mb-2">Динамика продаж</p>
          <h2 className="text-xl font-bold">Оплаченные заказы по дням</h2>
          <p className="text-sm text-[#888] mt-1">Сравнение с предыдущим периодом такой же длины</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {([7, 14, 30, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setPeriod(days)}
              className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${period === days ? "bg-[#E8845A] text-white" : "bg-[#fdf8f5] text-[#666] hover:text-[#E8845A]"}`}
            >
              {days} дней
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPeriod("custom")}
            className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${period === "custom" ? "bg-[#E8845A] text-white" : "bg-[#fdf8f5] text-[#666] hover:text-[#E8845A]"}`}
          >
            Свой период
          </button>
        </div>
      </div>

      {period === "custom" && (
        <div className="flex flex-wrap gap-3 mb-6 p-4 rounded-2xl bg-[#fdf8f5]">
          <label className="text-xs font-semibold text-[#777]">
            С даты
            <input type="date" value={customFrom} max={today} onChange={(event) => event.target.value && setCustomFrom(event.target.value)} className="block mt-1.5 rounded-xl border border-[#eadfd6] bg-white px-3 py-2 text-sm text-[#222]" />
          </label>
          <label className="text-xs font-semibold text-[#777]">
            По дату
            <input type="date" value={customTo} max={today} onChange={(event) => event.target.value && setCustomTo(event.target.value)} className="block mt-1.5 rounded-xl border border-[#eadfd6] bg-white px-3 py-2 text-sm text-[#222]" />
          </label>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <button type="button" onClick={() => setMetric("revenue")} className={`text-left rounded-2xl border p-4 transition-colors ${metric === "revenue" ? "border-[#E8845A] bg-[#fff8f4]" : "border-[#f0e8e0]"}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-[#777]">Выручка за период</span>
            <TrendingUp size={18} className="text-[#E8845A]" />
          </div>
          <p className="text-2xl font-bold mt-2">{Math.round(stats.revenue).toLocaleString("ru-RU")} ₽</p>
          <p className="text-xs mt-1"><Comparison value={percentChange(stats.revenue, stats.previousRevenue)} /> <span className="text-[#999]">к прошлому периоду</span></p>
        </button>
        <button type="button" onClick={() => setMetric("orders")} className={`text-left rounded-2xl border p-4 transition-colors ${metric === "orders" ? "border-[#E8845A] bg-[#fff8f4]" : "border-[#f0e8e0]"}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-[#777]">Оплаченных заказов</span>
            <ShoppingBag size={18} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.orderCount.toLocaleString("ru-RU")}</p>
          <p className="text-xs mt-1"><Comparison value={percentChange(stats.orderCount, stats.previousOrders)} /> <span className="text-[#999]">к прошлому периоду</span></p>
        </button>
      </div>

      <div className="rounded-2xl bg-[#fdfaf8] border border-[#f3ebe5] p-3 sm:p-4 overflow-hidden">
        <div className="flex items-center justify-between gap-3 px-1 mb-2 text-xs text-[#888]">
          <span>{formatShortDate(range.from)} — {formatShortDate(range.to)}</span>
          <span className="font-semibold text-[#E8845A]"><Comparison value={currentComparison} /></span>
        </div>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[240px] sm:h-[280px]" role="img" aria-label={metric === "revenue" ? "График выручки по дням" : "График оплаченных заказов по дням"}>
          <defs>
            <linearGradient id="sales-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#E8845A" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#E8845A" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const gridY = top + plotHeight * ratio;
            const label = maxValue * (1 - ratio);
            return (
              <g key={ratio}>
                <line x1={left} x2={width - right} y1={gridY} y2={gridY} stroke="#eadfd6" strokeDasharray="4 6" />
                <text x={left - 9} y={gridY + 4} textAnchor="end" fontSize="12" fill="#aaa">
                  {metric === "revenue" ? Math.round(label).toLocaleString("ru-RU") : Math.round(label)}
                </text>
              </g>
            );
          })}
          {area && <path d={area} fill="url(#sales-area)" />}
          {path && <path d={path} fill="none" stroke="#E8845A" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />}
          {stats.points.map((point, index) => (
            <g key={point.day}>
              <circle cx={x(index)} cy={y(point[metric])} r={stats.points.length <= 31 ? 4 : 2.5} fill="white" stroke="#E8845A" strokeWidth="3">
                <title>{formatShortDate(point.day)}: {metric === "revenue" ? `${Math.round(point.revenue).toLocaleString("ru-RU")} ₽` : `${point.orders} зак.`}</title>
              </circle>
              {(index % labelEvery === 0 || index === stats.points.length - 1) && (
                <text x={x(index)} y={height - 12} textAnchor="middle" fontSize="12" fill="#999">{formatShortDate(point.day)}</text>
              )}
            </g>
          ))}
        </svg>
      </div>
    </section>
  );
}
