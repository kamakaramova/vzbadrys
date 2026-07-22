import CatalogClient from "./CatalogClient";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string; badge?: string }>;
}) {
  const params = await searchParams;
  const cat = params.cat === "bads" || params.cat === "seeds" ? params.cat : undefined;

  return <CatalogClient cat={cat} badge={params.badge} />;
}
