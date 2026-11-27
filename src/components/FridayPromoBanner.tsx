"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";

const FRIDAY_PROMO_CODE = "ПЯТНИЦА";

interface FridayPromoBannerProps {
  className?: string;
  action?: { href: string; label: string };
}

export default function FridayPromoBanner({
  className = "",
  action = { href: "/catalog?cat=bads", label: "К добавкам" },
}: FridayPromoBannerProps) {
  const [copyStatus, setCopyStatus] = useState("");
  const copied = copyStatus === "Промокод скопирован";

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(FRIDAY_PROMO_CODE);
      setCopyStatus("Промокод скопирован");
    } catch {
      setCopyStatus(`Введите ${FRIDAY_PROMO_CODE} в корзине`);
    }
  }

  return (
    <aside aria-label="Акция «Чёрная пятница»" className={`w-full overflow-hidden rounded-3xl bg-[#201d19] text-[#fff9e9] ${className}`}>
      <div aria-hidden="true" className="h-1.5 bg-[repeating-linear-gradient(125deg,#ffdb55_0px,#ffdb55_10px,#201d19_10px,#201d19_14px)]" />
      <div className="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-5 py-5 sm:px-7 sm:py-6">
        <div>
          <p className="text-lg font-black leading-tight sm:text-2xl">Чёрная пятница возвращается!</p>
          <p className="mt-2 text-sm leading-relaxed">
            <strong className="text-[#ffdb55]">−20% по промокоду</strong> на отдельные БАДы и на набор из трёх. На набор уже действует скидка.
          </p>
          <p className="mt-1 text-xs text-[#ded2ba]">Не успели в прошлый раз? Введите промокод в корзине.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void copyCode()}
            aria-label={`Скопировать промокод ${FRIDAY_PROMO_CODE}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-dashed border-[#b79c43] bg-[#352d1b] px-4 font-mono text-sm font-bold tracking-wider text-[#ffdb55] transition-colors hover:bg-[#493c20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffdb55]"
          >
            {FRIDAY_PROMO_CODE}
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
          </button>
          <Link href={action.href} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#ffdb55] px-4 text-sm font-extrabold text-[#201d19] no-underline transition-colors hover:bg-[#ffe582] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ffdb55]">
            {action.label} <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <span role="status" className={copyStatus ? "basis-full text-xs text-[#ded2ba]" : "sr-only"}>{copyStatus}</span>
        </div>
      </div>
    </aside>
  );
}
