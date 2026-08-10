"use client";

import { useEffect } from "react";

export default function PaymentFailStatusSync({ orderId }: { orderId: string }) {
  useEffect(() => {
    void fetch(`/api/ozon/order-status?order=${encodeURIComponent(orderId)}`, { cache: "no-store" });
  }, [orderId]);

  return null;
}
