"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

export interface PochtaPoint {
  id: string;
  address: string;
  index: string;
  name: string;
  city: string;
  deliveryPriceKopecks?: number;
  deliveryDescription?: string;
}

declare global {
  interface Window {
    ecomStartWidget?: (opts: {
      id: number;
      callbackFunction: ((data: Record<string, unknown>) => void) | null;
      containerId: string;
    }) => void;
  }
}

const WIDGET_SRC = "https://widget.pochta.ru/map/widget/widget.js";

function getDeliveryDescription(value: unknown) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "description" in value) {
    const description = (value as { description?: unknown }).description;
    return typeof description === "string" ? description : undefined;
  }
  return undefined;
}

export default function PochtaWidget({
  onSelect,
  onClose,
  widgetId,
}: {
  onSelect: (p: PochtaPoint) => void;
  onClose: () => void;
  widgetId: number;
}) {
  useEffect(() => {
    const start = () => {
      if (!window.ecomStartWidget) return;
      window.ecomStartWidget({
        id: widgetId,
        containerId: "ecom-widget",
        callbackFunction: (data) => {
          const d = data as Record<string, unknown>;
          // Выводим полный JSON ответа виджета — для отладки и для Почты России.
          // Реальные поля ответа виджета Почты России (по документации):
          // addressTo, cityTo, regionTo, indexTo, areaTo, id, mailType, cashOfDelivery
          const street = (d.addressTo as string) || (d.address as string) || "";
          const city = (d.cityTo as string) || "";
          const region = (d.regionTo as string) || "";
          const area = (d.areaTo as string) || "";
          const index = String((d.indexTo as string) || (d.index as string) || "");
          // Виджет возвращает стоимость доставки в копейках в поле cashOfDelivery.
          const rawDeliveryPrice = Number(d.cashOfDelivery);
          const deliveryPriceKopecks = Number.isInteger(rawDeliveryPrice) && rawDeliveryPrice >= 0
            ? rawDeliveryPrice
            : undefined;
          const fullAddress =
            [region, area, city, street].filter(Boolean).join(", ") || street || "Пункт Почты России";
          const name = String((d.id as string | number) ? `Отделение ${d.id}` : "Пункт Почты России");
          onSelect({
            id: String(d.id ?? ""),
            address: fullAddress,
            index,
            name,
            city,
            deliveryPriceKopecks,
            deliveryDescription: getDeliveryDescription(d.deliveryDescription),
          });
        },
      });
    };

    if (window.ecomStartWidget) {
      start();
      return;
    }
    const existing = document.querySelector(`script[src="${WIDGET_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", start);
      return () => existing.removeEventListener("load", start);
    }
    const s = document.createElement("script");
    s.src = WIDGET_SRC;
    s.async = true;
    s.onload = start;
    document.body.appendChild(s);
  }, [onSelect, widgetId]);

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-[#f0e8e0] flex items-center justify-between">
          <p className="font-bold">Выберите пункт Почты России</p>
          <button onClick={onClose} className="text-[#aaa] hover:text-[#1a1a1a]"><X size={20} /></button>
        </div>
        <div id="ecom-widget" style={{ height: 500, width: "100%" }} />
        <div className="px-6 py-3 border-t border-[#f0e8e0] text-xs text-[#aaa]">
          Найдите удобное отделение на карте и нажмите на него — адрес подставится автоматически.
        </div>
      </div>
    </div>
  );
}
