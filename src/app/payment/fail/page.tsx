import Link from "next/link";
import { X } from "lucide-react";

import Footer from "@/components/Footer";
import Header from "@/components/Header";

export default async function PaymentFailPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;
  return (
    <>
      <Header />
      <main className="min-h-[70vh] flex items-center justify-center px-4 py-20 bg-[#fdfcfb]">
        <div className="w-full max-w-lg bg-white border border-[#f0e8e0] rounded-3xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <X className="text-red-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold mb-3">Оплата не завершена</h1>
          <p className="text-sm text-[#6b6b6b] mb-2">Деньги не списаны, товары остались в корзине.</p>
          {order && <p className="text-xs text-[#aaa] mb-7">Номер попытки: {order}</p>}
          <div className="flex flex-col sm:flex-row justify-center gap-3 mt-7">
            <Link href="/checkout" className="bg-[#E8845A] text-white font-semibold px-7 py-3 rounded-full">
              Попробовать ещё раз
            </Link>
            <Link href="/cart" className="border border-[#E8845A] text-[#E8845A] font-semibold px-7 py-3 rounded-full">
              Вернуться в корзину
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
