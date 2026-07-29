import "server-only";
import { createHmac } from "crypto";

const DEFAULT_GATEWAY_URL = "https://api.xn--80abckmj9cj3h.xn--p1ai";

export function getOzonDeliveryGatewayAuthorizeUrl() {
  const secret = process.env.OZON_DELIVERY_GATEWAY_SHARED_SECRET;
  if (!secret) {
    throw new Error("Защищённая связь с сервером Ozon ещё не настроена в Vercel");
  }

  const payload = Buffer.from(JSON.stringify({ expiresAt: Date.now() + 10 * 60 * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  const gatewayUrl = (process.env.OZON_DELIVERY_GATEWAY_URL || DEFAULT_GATEWAY_URL).replace(/\/$/, "");

  return `${gatewayUrl}/oauth/start?ticket=${encodeURIComponent(`${payload}.${signature}`)}`;
}
