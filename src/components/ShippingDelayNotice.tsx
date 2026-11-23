export default function ShippingDelayNotice({ className = "" }: { className?: string }) {
  return (
    <aside
      aria-label="Отгрузка заказов восстановлена"
      className={[
        "rounded-2xl border border-[#f0d8ca] bg-[#fff8f4] p-4 shadow-[0_8px_24px_rgba(83,55,42,0.05)] sm:p-5",
        className,
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#E8845A] text-base font-bold text-white"
        >
          ✓
        </span>
        <div>
          <p className="font-semibold text-[#1a1a1a]">Отгрузка восстановлена</p>
          <p className="mt-1 text-sm leading-6 text-[#6b625d]">
            Заказы снова отправляем в обычные сроки. С удовольствием ждём ваши заказы!
          </p>
        </div>
      </div>
    </aside>
  );
}
