import type { EmailOrder } from "./templates";

export interface PaymentOrderRow {
  id: string;
  amount_kopecks: number;
  customer: Record<string, unknown>;
  items: Record<string, unknown>[];
  delivery: Record<string, unknown>;
}

export function emailAddressFromOrder(order: PaymentOrderRow) {
  return String(order.customer?.email || "").trim().toLowerCase();
}

export function toEmailOrder(order: PaymentOrderRow): EmailOrder {
  const customerName = [order.customer?.name, order.customer?.surname]
    .filter(Boolean)
    .map(String)
    .join(" ");
  const delivery = order.delivery || {};

  return {
    id: order.id,
    customerName,
    total: Number(order.amount_kopecks || 0) / 100,
    items: (order.items || []).map((item) => ({
      name: String(item.name || "Товар"),
      quantity: Number(item.quantity || 1),
      price: Number(item.unitPrice || 0),
    })),
    deliveryMethod: String(delivery.method || ""),
    deliveryAddress: [delivery.city, delivery.address].filter(Boolean).map(String).join(", "),
    trackNumber: delivery.trackNumber ? String(delivery.trackNumber) : undefined,
  };
}
