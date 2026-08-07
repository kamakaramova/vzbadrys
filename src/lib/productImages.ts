// Конвенция фото товаров:
// кладёшь файлы в public/products/<id-товара>/1.jpg или 1.png, 2.jpg или 2.png ...
// они автоматически становятся каруселью на карточке и странице товара.
// Для товаров с загруженными PNG используем расширение PNG.
export function productImagePaths(id: string, max = 8): string[] {
  const extension = ["magniy-bisglitinat", "selen-tsink"].includes(id)
    ? "png"
    : "jpg";
  return Array.from({ length: max }, (_, i) => `/products/${id}/${i + 1}.${extension}`);
}
