// Конвенция фото товаров:
// кладёшь файлы в public/products/<id-товара>/1.jpg, 2.jpg, 3.jpg ...
// они автоматически становятся каруселью на карточке и странице товара.
// Для уже загруженного магния бисглицината используются PNG.
export function productImagePaths(id: string, max = 8): string[] {
  const extension = id === "magniy-bisglitinat" ? "png" : "jpg";
  return Array.from({ length: max }, (_, i) => `/products/${id}/${i + 1}.${extension}`);
}
