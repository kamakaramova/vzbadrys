// Конвенция фото товаров:
// кладёшь файлы в public/products/<id-товара>/1.jpg, 2.jpg, 3.jpg ...
// они автоматически становятся каруселью на карточке и странице товара.
// Формат — JPG, размер 1080×1350 (4:5).
export function productImagePaths(id: string, max = 8): string[] {
  return Array.from({ length: max }, (_, i) => `/products/${id}/${i + 1}.jpg`);
}
