"use client";

import { useEffect } from "react";

export default function PaymentFailStatusSync({ orderId, token }: { orderId: string; token: string }) {
  useEffect(() => {
    void fetch(`/api/ozon/order-status?order=${encodeURIComponent(orderId)}&result=failed&token=${encodeURIComponent(token)}`, { cache: "no-store" });
  }, [orderId, token]);

  return null;
}
