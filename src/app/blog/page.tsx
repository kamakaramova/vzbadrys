import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Статьи о здоровье — Взбадрись",
  description: "Полезные статьи о витаминах, БАДах, питании и здоровье от нутрициолога Камы Карамовой. Магний, цинк, железо, ЖКТ и многое другое.",
};

const articles = [
  {
    slug: "zachem-nuzhen-magniy",
    title: "Зачем нужен магний: дефицит, симптомы и как восполнить",
    excerpt: "Магний участвует в более чем 300 биохимических процессах. Разбираемся, почему он так важен, как проявляется его дефицит и какая форма лучше усваивается.",
    tag: "Магний",
    date: "27 июня 2025",
    readTime: "8 мин",
  },
];

export default function BlogPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen">
        <section className="bg-[#fdf8f5] border-b border-[#f0e8e0] py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-xs font-semibold text-[#E8845A] uppercase tracking-widest mb-3">Блог</p>
            <h1 className="text-3xl md:text-4xl font-bold mb-3">Статьи о здоровье</h1>
            <p className="text-[#6b6b6b] max-w-lg">Разбираем витамины, БАДы и питание — честно, с научной базой и без лишней воды.</p>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((a) => (
              <Link key={a.slug} href={`/blog/${a.slug}`} className="group block bg-white rounded-3xl border border-[#f0e8e0] overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <div className="h-44 bg-gradient-to-br from-[#FDDCCA] to-[#f5b898] flex items-center justify-center">
                  <span className="text-6xl">💊</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-xs font-semibold bg-[#FDDCCA] text-[#8b4513] px-3 py-1 rounded-full">{a.tag}</span>
                    <span className="text-xs text-[#aaa]">{a.readTime}</span>
                  </div>
                  <h2 className="font-bold text-base leading-snug mb-2 group-hover:text-[#E8845A] transition-colors">{a.title}</h2>
                  <p className="text-sm text-[#6b6b6b] leading-relaxed line-clamp-3">{a.excerpt}</p>
                  <p className="text-xs text-[#aaa] mt-4">{a.date}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
