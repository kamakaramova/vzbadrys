export default function BlackFridayShippingNotice({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-label="Временное увеличение срока отправки"
      className={[
        "relative overflow-hidden rounded-2xl border border-[#f8d933] bg-[#151515] px-4 pb-4 pt-5 text-white shadow-[0_8px_24px_rgba(21,21,21,0.08)] sm:px-5",
        className,
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5 bg-[repeating-linear-gradient(135deg,#f8d933_0px,#f8d933_9px,#151515_9px,#151515_18px)]"
      />
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f8d933] text-sm font-black text-[#151515]"
        >
          !
        </span>
        <p className="text-sm leading-6 text-[#f5f3ea]">
          В связи с большим числом заказов в Чёрную пятницу срок отправки товаров временно увеличен.
          <strong className="ml-1 font-bold text-[#f8d933]">Благодарим за понимание.</strong>
        </p>
      </div>
    </aside>
  );
}
