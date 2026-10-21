/**
 * Единое правило для экрана оформления и сервера. Клиент видит цену сразу,
 * а сервер повторно рассчитывает её и не принимает цену из браузера.
 */
export const OZON_PVZ_DELIVERY_PRICE = 250;
export const DELIVERY_CONTACT_EMAIL = "vzbadris@yandex.ru";

type Destination = { country?: string; region?: string; city?: string; address?: string };

const FOREIGN_PLACE_NAMES = /(^|\s)(беларус[ьи]|белорусси[яи]|казахстан[а]?|узбекистан[а]?|кыргызстан[а]?|киргизии|армени[яи]|грузи[яи]|азербайджан[а]?|турци[яи]|минск[а]?|астан[аы]|алмат[ыа])(\s|$)/;

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
export function isKaliningradDestination(destination: Destination) {
  const place = normalizePlace(`${destination.region || ""} ${destination.city || ""} ${destination.address || ""}`);
  if (!place) return false;
  if (place.includes("калининград")) return true;
  if (/(^|\s)светл(ый|ого|ому|ым|ом|ые|ых|ыми)?(\s|$)/.test(place)) return true;
  return KALININGRAD_CITY_STEMS.some((city) => new RegExp(`(^|\\s)${city}`).test(place));
}

export function getDeliveryRestriction(destination: Destination): "kaliningrad" | "international" | null {
  if (isKaliningradDestination(destination)) return "kaliningrad";
  const country = (destination.country || "")
    .trim().toLowerCase().replace(/ё/g, "е").replace(/[.,]/g, "").replace(/\s+/g, " ");
  if (country && !["россия", "российская федерация", "рф", "russia"].includes(country)) return "international";
  if (FOREIGN_PLACE_NAMES.test(normalizePlace(`${destination.region || ""} ${destination.city || ""}`))) return "international";
  return null;
}

export function getDeliveryRestrictionMessage(restriction: "kaliningrad" | "international") {
  const destination = restriction === "kaliningrad" ? "в Калининградскую область" : "за пределы России";
  return `Нам очень жаль, но пока мы не можем оформить доставку ${destination} прямо на сайте. Если вы готовы рассмотреть доставку за дополнительную плату, напишите нам на ${DELIVERY_CONTACT_EMAIL}. Мы проверим возможность отправки, заранее сообщим стоимость и согласуем условия с вами.`;
}

export function getOzonPvzDeliveryPrice() {
  return OZON_PVZ_DELIVERY_PRICE;
}
