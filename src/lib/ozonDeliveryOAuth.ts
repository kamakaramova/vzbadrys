import "server-only";

const AUTHORIZATION_URL = "https://seller.ozon.ru/app/appstore/oauth/authorize";
const TOKEN_URL = "https://api-seller.ozon.ru/v1/oauth/token";
const CALLBACK_PATH = "/api/ozon/delivery/oauth/callback";

export function getOzonDeliveryOAuthConfig() {
  const clientId = process.env.OZON_DELIVERY_OAUTH_CLIENT_ID;
  const clientSecret = process.env.OZON_DELIVERY_OAUTH_CLIENT_SECRET;
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://xn--80abckmj9cj3h.xn--p1ai").replace(/\/$/, "");
  if (!clientId || !clientSecret) throw new Error("OAuth-данные Ozon Доставки ещё не добавлены в Vercel");
  return { clientId, clientSecret, redirectUri: `${siteUrl}${CALLBACK_PATH}` };
}

export function getOzonDeliveryAuthorizeUrl(state: string) {
  const config = getOzonDeliveryOAuthConfig();
  const url = new URL(AUTHORIZATION_URL);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("scope", "seller-api.ozon-logistics seller-api.posting-fbs");
  url.searchParams.set("state", state);
  return url.toString();
}

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
};

export async function exchangeOzonDeliveryCode(code: string) {
  const config = getOzonDeliveryOAuthConfig();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({})) as TokenResponse;
  if (!response.ok || !payload.access_token) throw new Error("Ozon не подтвердил подключение приложения");
  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token || null,
    expiresAt: payload.expires_in ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null,
    scope: payload.scope || null,
  };
}
