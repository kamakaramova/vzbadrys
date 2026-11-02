"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import HeroSection from "@/components/HeroSection";

const SALE_START = Date.parse("2026-11-13T00:00:00+03:00");
const SALE_END = Date.parse("2026-11-14T00:00:00+03:00");

function timeParts(milliseconds: number) {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  return [
    Math.floor(seconds / 86400),
    Math.floor((seconds % 86400) / 3600),
    Math.floor((seconds % 3600) / 60),
    seconds % 60,
  ].map((part) => String(part).padStart(2, "0"));
}

export default function BlackFridayHomeHero() {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  // После акции главная страница сама возвращается к обычной обложке.
  if (now !== null && now >= SALE_END) return <HeroSection />;

  const isLive = now !== null && now >= SALE_START;
  const remaining = now === null ? null : timeParts((isLive ? SALE_END : SALE_START) - now);
  const units = ["дней", "часов", "минут", "секунд"];

  return (
    <>
      <section aria-labelledby="black-friday-heading" className="relative overflow-hidden bg-[#101011] text-white">
        <div aria-hidden="true" className="absolute inset-x-0 top-0 h-2 bg-[repeating-linear-gradient(135deg,#f8d933_0px,#f8d933_14px,#101011_14px,#101011_28px)]" />
        <div aria-hidden="true" className="pointer-events-none absolute -right-8 top-20 hidden text-[28rem] font-black leading-none text-white/[0.025] lg:block">13</div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 pb-12 pt-16 sm:px-8 lg:min-h-[630px] lg:grid-cols-[1.12fr_0.88fr] lg:gap-14 lg:py-14">
          <div className="relative z-10">
            <p className="mb-5 flex items-center gap-3 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#f8d933] sm:text-xs">
              <span aria-hidden="true" className="h-0.5 w-6 bg-[#f8d933]" />
              Пятница, 13 ноября · только один день
            </p>
            <h1 id="black-friday-heading" className="text-[clamp(3.2rem,7vw,6rem)] font-black uppercase leading-[0.9] tracking-[-0.075em] text-[#f8d933]">
              Чёрная<br />пятница
            </h1>
            <h2 className="mt-8 text-[clamp(1.35rem,2.5vw,2rem)] font-bold leading-tight tracking-[-0.04em] text-[#fffaf3]">
              Три баночки выгоднее вместе
            </h2>
            <p className="mt-3 text-sm leading-7 text-[#d7d5cb] sm:text-base">
              Селен + цинк · Магний хелат · Магний цитрат + B6
            </p>
            <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <strong className="text-[clamp(2.5rem,4vw,3.4rem)] font-black tracking-[-0.06em] text-[#f8d933]">1 499 ₽</strong>
              <span className="text-lg font-semibold text-[#9c9b95] line-through">2 484 ₽</span>
              <span className="rounded border border-[#f8d933]/60 px-2 py-1 text-xs font-bold text-[#f8d933]">Экономия 985 ₽</span>
            </div>
            <p className="mt-3 text-sm text-[#e7e5dc]">
              На остальные товары — <strong className="text-[#f8d933]">−20% по промокоду ПЯТНИЦА</strong>
            </p>
            <p className="mt-2 text-xs text-[#aaa9a2]">Цены и промокод действуют только 13 ноября по московскому времени.</p>
            <Link href="/catalog" className="mt-7 inline-flex min-h-14 items-center justify-center gap-4 rounded bg-[#f8d933] px-7 text-sm font-extrabold text-[#101011] transition-colors hover:bg-[#ffe867] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f8d933]">
              Посмотреть товары <span aria-hidden="true" className="text-xl">→</span>
            </Link>
          </div>

          <div className="relative mx-auto w-[min(85%,420px)] pb-6 sm:w-[min(76%,470px)] lg:mr-4 lg:w-full lg:max-w-[470px]">
            <div aria-hidden="true" className="absolute inset-3 -right-3 bottom-3 rounded border-2 border-[#f8d933]" />
            <Image
              src="/hero-products.png"
              alt="Селен с цинком, магний хелат и магний цитрат взБАДрись"
              width={1122}
              height={1402}
              priority
              className="relative aspect-[4/5] w-full rounded object-cover object-[center_37%]"
            />
            <div className="absolute -right-4 top-8 rotate-12 bg-[#f8d933] px-6 py-2 text-xs font-black uppercase tracking-widest text-[#101011] shadow-lg sm:-right-7 sm:text-sm">
              13 ноября
            </div>
            <div className="absolute -bottom-2 -left-8 flex h-24 w-24 -rotate-12 flex-col items-center justify-center rounded-full bg-[#f8d933] text-[#101011] shadow-xl sm:-left-12 sm:h-32 sm:w-32">
              <strong className="text-2xl font-black tracking-tighter sm:text-4xl">−40%</strong>
              <span className="text-[9px] font-extrabold uppercase tracking-wide sm:text-[10px]">на набор</span>
            </div>
            <div className="absolute -bottom-4 -right-5 flex h-20 w-20 rotate-12 flex-col items-center justify-center rounded-full bg-[#e8845a] text-white shadow-xl sm:-right-8 sm:h-24 sm:w-24">
              <strong className="text-xl font-black tracking-tighter sm:text-2xl">−20%</strong>
              <span className="text-[8px] font-extrabold uppercase tracking-wide">на остальное</span>
            </div>
          </div>
        </div>
      </section>
      <section aria-label="Обратный отсчёт акции" className="bg-[#f8d933] text-[#101011]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-5 sm:px-8 lg:min-h-28 lg:flex-row lg:gap-8">
          <div className="text-center lg:text-left">
            <p className="text-base font-extrabold sm:text-lg">{isLive ? "До конца акции осталось" : "До старта акции осталось"}</p>
            <p className="mt-1 text-xs font-semibold">{isLive ? "Предложение действует до 23:59 по Москве" : "Начало 13 ноября в 00:00 по Москве"}</p>
          </div>
          <div role="timer" aria-label={isLive ? "Время до конца акции" : "Время до начала акции"} className="flex items-start gap-2 font-variant-numeric-tabular sm:gap-3">
            {units.map((unit, index) => (
              <div key={unit} className="flex items-start gap-2 sm:gap-3">
                {index > 0 && <span aria-hidden="true" className="pt-0.5 text-xl font-black sm:text-2xl">:</span>}
                <div className="min-w-12 text-center sm:min-w-16">
                  <span className="block text-2xl font-black leading-none tabular-nums sm:text-3xl">{remaining?.[index] ?? "--"}</span>
                  <span className="mt-1 block text-[9px] font-bold uppercase tracking-wider sm:text-[10px]">{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
