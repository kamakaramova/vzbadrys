/**
 * Наименования для кассового чека и маркировки.
 *
 * Это не витринные названия: на сайте остаются короткие, понятные покупателю
 * названия. Здесь фиксируем формулировки, совпадающие с «Честным знаком».
 */
const FISCAL_PRODUCT_NAMES: Record<string, string> = {
  "magniy-bisglitinat": "Биологически активная добавка к пище «Магния хелат оптимум» («Magnesium chelate optimum»)",
  "magniy-citrat-b6": "Биологически активная добавка к пище «Магний цитрат+В6 оптимум (Magnesium Citrate+B6 optimum)»",
  "selen-tsink": "Биологически активная добавка к пище «Селен+цинк максимум» («Selenium+Zink maximum»)",
};

export function getFiscalProductName(productId: string, fallbackName: string) {
  return FISCAL_PRODUCT_NAMES[productId] ?? fallbackName;
}
