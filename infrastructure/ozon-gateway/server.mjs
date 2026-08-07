import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import http from "node:http";

const AUTHORIZATION_URL = "https://seller.ozon.ru/app/appstore/oauth/authorize";
// Частные приложения получают OAuth-токены через отдельный API Ozon.
const TOKEN_URL = "https://xapi.ozon.ru/oauth/token";
const GATEWAY_URL = "https://api.xn--80abckmj9cj3h.xn--p1ai";
const CALLBACK_URL = `${GATEWAY_URL}/oauth/callback`;
const TOKEN_DIRECTORY = "/var/lib/vzbadrys-gateway";
const TOKEN_FILE = `${TOKEN_DIRECTORY}/ozon-delivery-tokens.json`;
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

function verifyTicket(ticket) {
  const [payload, signature, extra] = (ticket || "").split(".");
  if (!payload || !signature || extra) return false;
  const expected = createHmac("sha256", required("GATEWAY_SHARED_SECRET")).update(payload).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof data.expiresAt === "number" && data.expiresAt > Date.now() && data.expiresAt - Date.now() <= 11 * 60 * 1000;
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
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.access_token !== "string") {
    const detail = [payload.error, payload.error_description, payload.message, payload.incidentId]
      .filter((item) => typeof item === "string" && item.length > 0)
      .join(" | ")
      .slice(0, 500);
    throw new Error(`Ozon token exchange failed: ${response.status}${detail ? `: ${detail}` : ""}`);
  }
  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === "string" ? payload.refresh_token : null,
    expiresAt: typeof payload.expires_in === "number" ? new Date(Date.now() + payload.expires_in * 1000).toISOString() : null,
    scope: typeof payload.scope === "string" ? payload.scope : null,
    updatedAt: new Date().toISOString(),
  };
}

async function persistTokens(tokens) {
  await mkdir(TOKEN_DIRECTORY, { recursive: true, mode: 0o700 });
  const temporaryFile = `${TOKEN_FILE}.${process.pid}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(tokens), { mode: 0o600 });
  await rename(temporaryFile, TOKEN_FILE);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || "/", GATEWAY_URL);
  try {
    if (request.method === "GET" && url.pathname === "/gateway-health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "ok" }));
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
    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Gateway error");
    sendHtml(response, 503, "Подключение не завершено", "Сервис временно недоступен. Вернитесь в админку и попробуйте ещё раз.");
  }
});

server.listen(3001, "127.0.0.1");
