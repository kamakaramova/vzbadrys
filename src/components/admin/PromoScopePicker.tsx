"use client";

import { useId, useState } from "react";

type PromoProduct = { id: string; name: string };

export default function PromoScopePicker({
  products,
  value,
  onChange,
}: {
  products: PromoProduct[];
  value: string[] | null;
  onChange: (next: string[] | null) => void;
}) {
  const [search, setSearch] = useState("");
  const groupName = useId();
  const visible = products.filter((product) => product.name.toLocaleLowerCase("ru-RU").includes(search.toLocaleLowerCase("ru-RU")));

  return (
    <fieldset className="rounded-2xl border border-[#f0e8e0] p-4">
      <legend className="px-1 text-xs font-semibold uppercase tracking-wide text-[#6b6b6b]">На какие товары действует</legend>
      <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="radio" name={groupName} checked={value === null} onChange={() => onChange(null)} className="accent-[#E8845A]" />
          Все товары
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="radio" name={groupName} checked={value !== null} onChange={() => onChange([])} className="accent-[#E8845A]" />
          Только выбранные
        </label>
      </div>
      {value !== null && (
        <div className="mt-4">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Найти товар"
            aria-label="Найти товар для промокода"
            className="mb-3 w-full rounded-xl border border-[#f0e8e0] px-3 py-2 text-sm outline-none focus:border-[#E8845A]"
          />
          <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-[#f0e8e0] p-2">
            {visible.map((product) => (
              <label key={product.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[#fff8f4]">
                <input
                  type="checkbox"
                  checked={value.includes(product.id)}
                  onChange={(event) => onChange(event.target.checked ? [...value, product.id] : value.filter((id) => id !== product.id))}
                  className="mt-0.5 accent-[#E8845A]"
                />
                <span>{product.name}</span>
              </label>
            ))}
            {visible.length === 0 && <p className="px-2 py-3 text-sm text-[#777]">Товары не найдены</p>}
          </div>
          <p className="mt-2 text-xs text-[#777]">Выбрано: {value.length}. Набор считается отдельным товаром.</p>
        </div>
      )}
    </fieldset>
  );
}
