"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useProducts } from "@/store/productStore";
import ProductClient from "./ProductClient";

export default function ProductPage() {
  const params = useParams();
  const id = params.id as string;
  const { products, ready } = useProducts();

  const product = products.find((p) => p.id === id);
  const related = product
    ? products.filter((p) => p.id !== product.id && p.category === product.category && p.inStock).slice(0, 3)
    : [];

  if (!ready) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex items-center justify-center py-24">
          <p className="text-[#aaa]">Загрузка…</p>
        </main>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <main className="min-h-screen flex flex-col items-center justify-center py-24 px-4 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-3">Товар не найден</h1>
          <p className="text-[#6b6b6b] mb-8">Возможно, он снят с продажи или ссылка устарела.</p>
          <Link href="/catalog" className="inline-block bg-[#E8845A] hover:bg-[#d4703f] text-white font-semibold px-8 py-3.5 rounded-full transition-all">
            В каталог →
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <ProductClient product={product} related={related} />
      <Footer />
    </>
  );
}
