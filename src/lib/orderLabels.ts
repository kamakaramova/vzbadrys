const DELIVERY_METHOD_LABELS: Record<string, string> = {
  pickup: "Самовывоз в Казани",
  ozon_pvz: "Доставка в ПВЗ Ozon",
  pochta: "Почта России",
  sdek_pvz: "Доставка в ПВЗ СДЭК",
  yandex_pvz: "Доставка в ПВЗ Яндекс Маркета",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  PAY_TYPE_OZON_CARD: "Ozon Карта",
  PAY_TYPE_BANK_CARD: "Банковская карта",
  PAY_TYPE_SBP: "СБП",
  PAY_TYPE_YOOMONEY: "ЮMoney",
  "Ozon Pay": "Онлайн-оплата через Ozon Pay",
};

export function deliveryMethodLabel(method: unknown) {
  const code = String(method ?? "").trim();
  return DELIVERY_METHOD_LABELS[code] || (code ? "Доставка" : "Не указано");
}

export function paymentMethodLabel(method: unknown) {
  const code = String(method ?? "").trim();
  return PAYMENT_METHOD_LABELS[code] || (code ? "Онлайн-оплата" : "Ozon Pay");
}
