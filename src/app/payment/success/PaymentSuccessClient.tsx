"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, LoaderCircle } from "lucide-react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useCartStore } from "@/store/cartStore";

type PaymentState = "checking" | "paid" | "pending" | "failed";

export default function PaymentSuccessClient({ orderId }: { orderId: string }) {
  const clearCart = useCartStore((state) => state.clearCart);
  const [state, setState] = useState<PaymentState>("checking");
  const [isTest, setIsTest] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempt = 0;

    const check = async () => {
      attempt += 1;
      try {
        const response = await fetch(`/api/ozon/order-status?order=${encodeURIComponent(orderId)}`, {
          cache: "no-store",
        });
        const data = await response.json();
        if (cancelled) return;
        if (response.ok && data.status === "paid") {
          setIsTest(Boolean(data.isTest));
          clearCart();
          setState("paid");
          return;
        }
        if (response.ok && data.status === "payment_failed") {
          setState("failed");
          return;
        }
      } catch {
        // Уведомление банка может прийти немного позже редиректа покупателя.
      }
      if (attempt < 8) timer = setTimeout(check, 1500);
      else setState("pending");
    };

    check();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [clearCart, orderId]);

  return (
    <>
      <Header />
      <main className="min-h-[70vh] flex items-center justify-center px-4 py-20 bg-[#fdfcfb]">
        <div className="w-full max-w-lg bg-white border border-[#f0e8e0] rounded-3xl p-8 text-center">
          {state === "checking" && (
            <>
              <LoaderCircle className="w-14 h-14 text-[#E8845A] animate-spin mx-auto mb-5" />
              <h1 className="text-2xl font-bold mb-3">Проверяем оплату</h1>
              <p className="text-sm text-[#6b6b6b]">Обычно это занимает несколько секунд. Не закрывайте страницу.</p>
            </>
          )}

          {state === "paid" && (
            <>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <Check className="text-green-600" size={32} />
              </div>
              <h1 className="text-2xl font-bold mb-3">Заказ оплачен</h1>
              <p className="text-[#6b6b6b] mb-2">Заказ <strong className="text-[#1a1a1a]">{orderId}</strong> принят и передан в сборку.</p>
              <p className="text-sm text-[#6b6b6b] mb-7">После отправки мы сообщим трек-номер. Чек поступит на указанный при оформлении email.</p>
              {isTest && <p className="text-xs font-semibold text-[#8b4513] bg-[#fff8f5] rounded-xl p-3 mb-6">Это тестовый заказ, деньги не списаны.</p>}
              <Link href="/catalog" className="inline-flex bg-[#E8845A] text-white font-semibold px-7 py-3 rounded-full hover:bg-[#d4703f] transition-colors">
                Вернуться в каталог
              </Link>
            </>
          )}

          {state === "pending" && (
            <>
              <h1 className="text-2xl font-bold mb-3">Платёж обрабатывается</h1>
              <p className="text-sm text-[#6b6b6b] mb-6">Банк ещё не прислал окончательное подтверждение. Заказ {orderId} сохранён, повторно оплачивать его не нужно.</p>
              <button onClick={() => window.location.reload()} className="bg-[#E8845A] text-white font-semibold px-7 py-3 rounded-full">
                Проверить ещё раз
              </button>
            </>
          )}

          {state === "failed" && (
            <>
              <h1 className="text-2xl font-bold mb-3">Оплата не прошла</h1>
              <p className="text-sm text-[#6b6b6b] mb-6">Товары остались в корзине. Вернитесь к оформлению и попробуйте ещё раз.</p>
              <Link href="/checkout" className="inline-flex bg-[#E8845A] text-white font-semibold px-7 py-3 rounded-full">
                Вернуться к оплате
              </Link>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
