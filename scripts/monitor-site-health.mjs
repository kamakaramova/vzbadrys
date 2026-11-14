import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const stateFile = process.env.MONITOR_STATE_FILE || "/var/lib/vzbadrys-monitor/state.json";
const adminPassword = process.env.ADMIN_PASSWORD || "";

async function requestCheck(name, url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...options.headers },
      signal: AbortSignal.timeout(options.timeoutMs || 20_000),
      cache: "no-store",
    });
    const body = await response.json().catch(() => null);
    const ok = response.ok && (body?.ok ?? true);
    const safeDetails = body?.checks && typeof body.checks === "object"
      ? Object.entries(body.checks)
          .filter(([, value]) => ["string", "number", "boolean"].includes(typeof value))
          .map(([key, value]) => `${key}=${value}`)
          .join(", ")
      : "";
    return { name, ok, detail: ok ? "ok" : safeDetails || `HTTP ${response.status}` };
  } catch (error) {
    const detail = error instanceof Error && error.name === "TimeoutError" ? "timeout" : "connection_error";
    return { name, ok: false, detail };
  }
}

async function systemdCheck() {
  try {
    const [{ stdout: active }, { stdout: result }] = await Promise.all([
      execFileAsync("/usr/bin/systemctl", ["is-active", "vzbadrys-payment-sync.timer"], { timeout: 10_000 }),
      execFileAsync("/usr/bin/systemctl", ["show", "vzbadrys-payment-sync.service", "--property=Result", "--value"], { timeout: 10_000 }),
    ]);
    const timerActive = active.trim() === "active";
    const lastRunOk = ["success", ""].includes(result.trim());
    return {
      name: "payment_and_bonus_sync",
      ok: timerActive && lastRunOk,
      detail: timerActive && lastRunOk ? "ok" : "timer_or_last_run_failed",
    };
  } catch {
    return { name: "payment_and_bonus_sync", ok: false, detail: "systemd_check_failed" };
  }
}

async function loadState() {
  try {
    return JSON.parse(await readFile(stateFile, "utf8"));
  } catch {
    return { status: "unknown", alertSent: false };
  }
}

async function saveState(state) {
  await mkdir(dirname(stateFile), { recursive: true, mode: 0o700 });
  await writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function sendAlert({ recovered, failures }) {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.MONITOR_ALERT_EMAIL || process.env.EMAIL_REPLY_TO || "vzbadris@yandex.ru";
  const from = process.env.EMAIL_FROM || "взБАДрись <zakaz@mail.xn--80abckmj9cj3h.xn--p1ai>";
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured");

  const title = recovered ? "Сайт снова работает нормально" : "Проверка сайта обнаружила проблему";
  const subject = recovered
    ? "✅ взБАДрись: сайт снова работает"
    : "⚠️ взБАДрись: проверка сайта обнаружила проблему";
  const rows = recovered
    ? "<p style=\"margin:0;color:#4a403b\">Повторная проверка прошла успешно. Витрина, база, оплаты и фоновые процессы отвечают нормально.</p>"
    : `<ul style=\"margin:12px 0 0;padding-left:20px;color:#4a403b\">${failures
        .map((failure) => `<li><b>${escapeHtml(failure.name)}</b>: ${escapeHtml(failure.detail)}</li>`)
        .join("")}</ul>`;
  const html = `<!doctype html><html><body style="margin:0;background:#fff8f3;font-family:Arial,sans-serif"><div style="max-width:620px;margin:24px auto;padding:28px;background:#fff;border:1px solid #f0d8c9;border-radius:20px"><div style="display:inline-block;padding:7px 12px;border-radius:999px;background:${recovered ? "#e7f7ed" : "#fff0bf"};font-weight:700;color:#1d1b1a">взБАДрись</div><h1 style="font-size:24px;line-height:1.25;margin:18px 0 12px;color:#1d1b1a">${title}</h1>${rows}<p style="margin:22px 0 0;color:#8a7d76;font-size:13px">Автоматическая проверка выполняется раз в 8 часов. Письма отправляются только при сбое и восстановлении.</p></div></body></html>`;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [recipient], subject, html }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Resend HTTP ${response.status}`);
}

const checks = await Promise.all([
  requestCheck("storefront", "https://vzbadris.ru/"),
  requestCheck("application_and_database", "http://127.0.0.1:3000/api/health"),
  requestCheck("ozon_delivery_gateway", "https://api.xn--80abckmj9cj3h.xn--p1ai/gateway-health"),
  adminPassword
    ? requestCheck("orders_and_payments", "http://127.0.0.1:3000/api/admin/ops-health", {
        headers: { "x-admin-password": adminPassword },
      })
    : Promise.resolve({ name: "orders_and_payments", ok: false, detail: "admin_password_not_configured" }),
  systemdCheck(),
]);

const failures = checks.filter((check) => !check.ok);
const currentStatus = failures.length === 0 ? "healthy" : "unhealthy";
const previous = await loadState();
let alertSent = currentStatus === "unhealthy" ? Boolean(previous.alertSent) : false;

if (currentStatus === "unhealthy" && (previous.status !== "unhealthy" || !previous.alertSent)) {
  try {
    await sendAlert({ recovered: false, failures });
    alertSent = true;
  } catch (error) {
    console.error(`Health monitor alert failed: ${error instanceof Error ? error.message : "unknown_error"}`);
    alertSent = false;
  }
} else if (currentStatus === "healthy" && previous.status === "unhealthy" && previous.alertSent) {
  try {
    await sendAlert({ recovered: true, failures: [] });
  } catch (error) {
    console.error(`Health monitor recovery alert failed: ${error instanceof Error ? error.message : "unknown_error"}`);
  }
}

await saveState({
  status: currentStatus,
  alertSent,
  checkedAt: new Date().toISOString(),
  checks: checks.map(({ name, ok, detail }) => ({ name, ok, detail })),
});

console.info(JSON.stringify({ status: currentStatus, checks }));
if (currentStatus === "unhealthy") process.exitCode = 1;
