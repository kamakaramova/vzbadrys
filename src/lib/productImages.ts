// Конвенция фото товаров:
// кладёшь файлы в public/products/<id-товара>/1.jpg или 1.png, 2.jpg или 2.png ...
// они автоматически становятся каруселью на карточке и странице товара.
// Для БАДов явно задаём число файлов: так в галерею не попадает несуществующая
// «восьмая» картинка и порядок всегда остаётся 1, 2, 3…
const PRODUCT_GALLERIES: Record<string, { extension: "jpg" | "png"; count: number }> = {
  "magniy-bisglitinat": { extension: "png", count: 7 },
  "magniy-citrat-b6": { extension: "jpg", count: 7 },
  "selen-tsink": { extension: "png", count: 6 },
};

export function productImagePaths(id: string, max = 8): string[] {
  const gallery = PRODUCT_GALLERIES[id];
  const extension = gallery?.extension ?? "jpg";
  const count = gallery ? Math.min(max, gallery.count) : max;
  return Array.from({ length: count }, (_, i) => `/products/${id}/${i + 1}.${extension}`);
}
