"use client";
import ProductCard from "@/components/ProductCard";
import { useProducts } from "@/store/productStore";

export default function FeaturedProducts() {
  const { products } = useProducts();
  const featured = products.filter((p) => p.category === "bads" && p.inStock).slice(0, 3);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {featured.map((product) => <ProductCard key={product.id} product={product} />)}
    </div>
  );
}
