/**
 * Единое правило для экрана оформления и сервера. Клиент видит цену сразу,
 * а сервер повторно рассчитывает её и не принимает цену из браузера.
 */
export const OZON_PVZ_DELIVERY_PRICE = 250;
export const KALININGRAD_OZON_PVZ_DELIVERY_PRICE = 650;

const KALININGRAD_CITY_STEMS = [
  "балтийск", "багратионовск", "гвардейск", "гурьевск", "гусев",
  "зеленоградск", "краснознаменск", "ладушкин", "мамонов", "неман",
  "нестеров", "озерск", "пионерск", "полесск", "правдинск",
  "приморск", "светлогорск", "славск", "советск", "черняховск",
];

function normalizePlace(value: string) {
  return value
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^а-я\s-]/g, " ")
    .replace(/[-\s]+/g, " ")
    .trim();
}

/**
 * Калининградская область и все её города. «Светлый» проверяем отдельно:
 * это короткое название, которое нельзя искать простым началом слова.
 */
export function isKaliningradDestination(destination: { region?: string; city?: string }) {
  const place = normalizePlace(`${destination.region || ""} ${destination.city || ""}`);
  if (!place) return false;
  if (place.includes("калининград")) return true;
  if (/(^|\s)светл(ый|ого|ому|ым|ом|ые|ых|ыми)?(\s|$)/.test(place)) return true;
  return KALININGRAD_CITY_STEMS.some((city) => new RegExp(`(^|\\s)${city}`).test(place));
}

export function getOzonPvzDeliveryPrice(destination: { region?: string; city?: string }) {
  return isKaliningradDestination(destination)
    ? KALININGRAD_OZON_PVZ_DELIVERY_PRICE
    : OZON_PVZ_DELIVERY_PRICE;
}
