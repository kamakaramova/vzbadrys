"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

export interface PochtaPoint {
  address: string;
  index: string;
  name: string;
  raw?: string;
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

const WIDGET_ID = 62650;
const WIDGET_SRC = "https://widget.pochta.ru/map/widget/widget.js";

export default function PochtaWidget({
  onSelect,
  onClose,
}: {
  onSelect: (p: PochtaPoint) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const start = () => {
      if (!window.ecomStartWidget) return;
      window.ecomStartWidget({
        id: WIDGET_ID,
        containerId: "ecom-widget",
        callbackFunction: (data) => {
          const d = data as Record<string, unknown>;
          // Выводим полный JSON ответа виджета — для отладки и для Почты России.
          const rawJson = JSON.stringify(d, null, 2);
          console.log("POCHTA_CALLBACK_JSON:", rawJson);
          try {
            (window as unknown as { __pochtaLastCallback?: string }).__pochtaLastCallback = rawJson;
          } catch {}
          const address =
            (d.address as string) ||
            (d.addressSource as string) ||
            (d.name as string) ||
            "";
          const index =
            (d.index as string) ||
            (d.postalCode as string) ||
            (d.postindex as string) ||
            "";
          const name = (d.name as string) || "Пункт Почты России";
          onSelect({ address: String(address), index: String(index), name: String(name), raw: rawJson });
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
  }, [onSelect]);

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
