"use client";
import ProductCard from "@/components/ProductCard";
import SeedCard from "@/components/SeedCard";
import { useProducts } from "@/store/productStore";

export default function FeaturedProducts() {
  const { products } = useProducts();
  const featured = products.filter((p) => p.inStock).slice(0, 3);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {featured.map((product) =>
        product.category === "seeds" && product.weightVariants ? (
          <SeedCard key={product.id} product={product} />
        ) : (
          <ProductCard key={product.id} product={product} />
        )
      )}
    </div>
  );
}
