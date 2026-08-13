const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error("Ozon payment sync: ADMIN_PASSWORD is not configured");
  process.exit(1);
}

try {
  const response = await fetch("http://127.0.0.1:3000/api/admin/orders/sync-payment-statuses", {
    method: "POST",
    headers: { "x-admin-password": password },
    signal: AbortSignal.timeout(120_000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  console.info(JSON.stringify({
    checked: Number(payload.checked ?? 0),
    changed: Number(payload.changed ?? 0),
    problems: Array.isArray(payload.problems) ? payload.problems.length : 0,
  }));
} catch (error) {
  console.error(`Ozon payment sync failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exit(1);
}
