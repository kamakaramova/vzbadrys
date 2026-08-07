import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import http from "node:http";

const AUTHORIZATION_URL = "https://seller.ozon.ru/app/appstore/oauth/authorize";
// Частные приложения получают OAuth-токены через отдельный API Ozon.
const TOKEN_URL = "https://xapi.ozon.ru/oauth/token";
const GATEWAY_URL = "https://api.xn--80abckmj9cj3h.xn--p1ai";
const CALLBACK_URL = `${GATEWAY_URL}/oauth/callback`;
const TOKEN_DIRECTORY = "/var/lib/vzbadrys-gateway";
const TOKEN_FILE = `${TOKEN_DIRECTORY}/ozon-delivery-tokens.json`;
const OZON_LOGISTICS_INFO_URL = "https://api-seller.ozon.ru/v1/seller/ozon-logistics/info";
const states = new Map();

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function sendHtml(response, status, title, text, success = false) {
  response.writeHead(status, { "content-type": "text/html; charset=utf-8" });
  response.end(`<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="margin:0;background:#fdfcfb;font-family:Arial,sans-serif;color:#1a1a1a"><main style="max-width:560px;margin:12vh auto;padding:32px;background:#fff;border:1px solid #f0e8e0;border-radius:24px;text-align:center"><div style="font-size:42px">${success ? "✓" : "!"}</div><h1 style="font-size:24px">${title}</h1><p style="line-height:1.5;color:#6b6b6b">${text}</p></main></body></html>`);
}

function cleanupStates() {
  const now = Date.now();
  for (const [state, expiresAt] of states) {
    if (expiresAt <= now) states.delete(state);
  }
}

function verifyTicket(ticket, purpose = null) {
  const [payload, signature, extra] = (ticket || "").split(".");
  if (!payload || !signature || extra) return false;
  const expected = createHmac("sha256", required("GATEWAY_SHARED_SECRET")).update(payload).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const isFresh = typeof data.expiresAt === "number" && data.expiresAt > Date.now() && data.expiresAt - Date.now() <= 11 * 60 * 1000;
    return isFresh && (purpose === null || data.purpose === purpose);
  } catch {
    return false;
  }
}

function authorizationUrl() {
  const url = new URL(AUTHORIZATION_URL);
  const state = randomUUID();
  states.set(state, Date.now() + 10 * 60 * 1000);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("client_id", required("OZON_DELIVERY_OAUTH_CLIENT_ID"));
  url.searchParams.set("redirect_uri", CALLBACK_URL);
  url.searchParams.set("scope", "seller-api.ozon-logistics seller-api.posting-fbs");
  url.searchParams.set("state", state);
  return url.toString();
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: required("OZON_DELIVERY_OAUTH_CLIENT_ID"),
    client_secret: required("OZON_DELIVERY_OAUTH_CLIENT_SECRET"),
    code,
    redirect_uri: CALLBACK_URL,
  });
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      accept: "application/json",
    },
    body,
  });
  const rawPayload = await response.text();
  let payload = {};
  try {
    payload = JSON.parse(rawPayload);
  } catch {
    // Ни содержимое, ни токены в журнал не записываем: достаточно статуса и типа ответа.
  }

  // Ozon использует OAuth-поля в snake_case. Запасные варианты оставлены для
  // совместимости с переходным форматом API, не меняя данные в самом токене.
  const tokenPayload = payload && typeof payload === "object" ? payload : {};
  const nestedPayload = tokenPayload.data && typeof tokenPayload.data === "object" ? tokenPayload.data : {};
  const accessToken = tokenPayload.access_token || tokenPayload.accessToken || nestedPayload.access_token || nestedPayload.accessToken;
  const refreshToken = tokenPayload.refresh_token || tokenPayload.refreshToken || nestedPayload.refresh_token || nestedPayload.refreshToken;
  const expiresIn = tokenPayload.expires_in || tokenPayload.expiresIn || nestedPayload.expires_in || nestedPayload.expiresIn;
  const scope = tokenPayload.scope || nestedPayload.scope;

  if (!response.ok || typeof accessToken !== "string") {
    const detail = [payload.error, payload.error_description, payload.message, payload.incidentId]
      .filter((item) => typeof item === "string" && item.length > 0)
      .join(" | ")
      .slice(0, 500);
    const payloadKeys = Object.keys(tokenPayload).sort().join(",") || "no-json-fields";
    const nestedKeys = Object.keys(nestedPayload).sort().join(",");
    const responseType = response.headers.get("content-type") || "unknown";
    throw new Error(`Ozon token exchange failed: ${response.status}${detail ? `: ${detail}` : ""}; content-type=${responseType}; fields=${payloadKeys}${nestedKeys ? `; data-fields=${nestedKeys}` : ""}; body-length=${rawPayload.length}`);
  }
  return {
    accessToken,
    refreshToken: typeof refreshToken === "string" ? refreshToken : null,
    expiresAt: typeof expiresIn === "number" ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
    scope: typeof scope === "string" ? scope : null,
    updatedAt: new Date().toISOString(),
  };
}

async function persistTokens(tokens) {
  await mkdir(TOKEN_DIRECTORY, { recursive: true, mode: 0o700 });
  const temporaryFile = `${TOKEN_FILE}.${process.pid}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(tokens), { mode: 0o600 });
  await rename(temporaryFile, TOKEN_FILE);
}

function sendJson(response, status, body) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  response.end(JSON.stringify(body));
}

async function getOzonLogisticsStatus() {
  let tokens;
  try {
    tokens = JSON.parse(await readFile(TOKEN_FILE, "utf8"));
  } catch {
    return { connected: false, reason: "token_missing" };
  }
  if (!tokens || typeof tokens.accessToken !== "string" || !tokens.accessToken) {
    return { connected: false, reason: "token_missing" };
  }

  // Это официальный лёгкий метод Ozon Logistics. В ответ наружу не передаём
  // ни access token, ни содержимое профиля — только результат проверки связи.
  const result = await fetch(OZON_LOGISTICS_INFO_URL, {
    method: "POST",
    headers: {
      authorization: `Bearer ${tokens.accessToken}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: "{}",
  });
  return { connected: result.ok, ozonStatus: result.status };
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", GATEWAY_URL);
  try {
    if (request.method === "GET" && url.pathname === "/gateway-health") {
      sendJson(response, 200, { status: "ok" });
      return;
    }
    if (request.method === "GET" && url.pathname === "/ozon/status") {
      if (!verifyTicket(url.searchParams.get("ticket"), "status")) {
        sendJson(response, 403, { error: "forbidden" });
        return;
      }
      const status = await getOzonLogisticsStatus();
      sendJson(response, status.connected ? 200 : 502, status);
      return;
    }
    if (request.method === "GET" && url.pathname === "/oauth/start") {
      cleanupStates();
      if (!verifyTicket(url.searchParams.get("ticket"))) {
        sendHtml(response, 403, "Подключение не начато", "Вернитесь в админку сайта и запустите подключение ещё раз.");
        return;
      }
      response.writeHead(302, { location: authorizationUrl() });
      response.end();
      return;
    }
    if (request.method === "GET" && url.pathname === "/oauth/callback") {
      const error = url.searchParams.get("error");
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      cleanupStates();
      if (error) {
        sendHtml(response, 400, "Подключение отменено", "Ozon не выдал доступ. Вернитесь в админку и попробуйте ещё раз.");
        return;
      }
      if (!code || !state || !states.has(state)) {
        sendHtml(response, 400, "Не удалось подтвердить подключение", "Ссылка устарела или открыта в другом браузере. Запустите подключение из админки ещё раз.");
        return;
      }
      states.delete(state);
      await persistTokens(await exchangeCode(code));
      sendHtml(response, 200, "Ozon Доставка подключена", "Доступ получен и сохранён на защищённом сервере. Можно закрыть эту страницу.", true);
      return;
    }
    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Gateway error");
    sendHtml(response, 503, "Подключение не завершено", "Сервис временно недоступен. Вернитесь в админку и попробуйте ещё раз.");
  }
});

server.listen(3001, "127.0.0.1");
