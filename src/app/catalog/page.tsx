import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import SeedCard from "@/components/SeedCard";
import { products } from "@/lib/products";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; badge?: string }>;
}) {
  const { cat, badge } = await searchParams;

  const catFilter = cat as "bads" | "seeds" | undefined;

  let filtered = products;
  if (catFilter) filtered = filtered.filter((p) => p.category === catFilter);
  if (badge === "new") filtered = filtered.filter((p) => p.badge === "Новинка");
  if (badge === "sale") filtered = filtered.filter((p) => p.oldPrice);

  const tabs = [
    { label: "Все товары", value: undefined },
    { label: "БАДы", value: "bads" },
    { label: "Семена", value: "seeds" },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen">
        {/* Шапка каталога */}
        <section className="bg-[#fdf8f5] border-b border-[#f0e8e0] py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold mb-6">Каталог</h1>
            <div className="flex flex-wrap gap-3">
              {tabs.map((tab) => (
                <a
                  key={tab.label}
                  href={tab.value ? `/catalog?cat=${tab.value}` : "/catalog"}
                  className={`px-5 py-2 rounded-full text-sm font-medium transition-all ${
                    catFilter === tab.value
                      ? "bg-[#E8845A] text-white"
                      : "bg-white border border-[#f0e8e0] text-[#6b6b6b] hover:border-[#E8845A] hover:text-[#E8845A]"
                  }`}
                >
                  {tab.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Товары */}
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {filtered.length === 0 ? (
              <div className="text-center py-20 text-[#aaa]">
                <p className="text-5xl mb-4">🌿</p>
                <p className="text-lg font-medium">Товары появятся скоро</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-[#aaa] mb-6">{filtered.length} {filtered.length === 1 ? "товар" : filtered.length < 5 ? "товара" : "товаров"}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filtered.map((product) =>
                    product.category === "seeds" && product.weightVariants ? (
                      <SeedCard key={product.id} product={product} />
                    ) : (
                      <ProductCard key={product.id} product={product} />
                    )
                  )}
                </div>
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
