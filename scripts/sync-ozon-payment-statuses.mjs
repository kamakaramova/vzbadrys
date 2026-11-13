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

  // Тот же защищённый таймер каждые 30 минут восстанавливает пропущенные
  // начисления по уже оплаченным заказам. Лишние начисления автоматически
  // не списываем: их безопаснее оставить для ручной проверки в админке.
  const bonusResponse = await fetch("http://127.0.0.1:3000/api/admin/bonus-stats/reconcile", {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-password": password },
    body: JSON.stringify({ fixExcess: false }),
    signal: AbortSignal.timeout(120_000),
  });
  const bonusPayload = await bonusResponse.json().catch(() => ({}));
  if (!bonusResponse.ok) throw new Error(`Bonus reconciliation HTTP ${bonusResponse.status}`);
  console.info(JSON.stringify({
    bonusReconciliation: true,
    linkedOrders: Number(bonusPayload.linkedOrders ?? 0),
    createdRewards: Number(bonusPayload.createdRewards ?? 0),
    createdAmount: Number(bonusPayload.createdAmount ?? 0),
    remainingExcess: Array.isArray(bonusPayload.skippedExcess) ? bonusPayload.skippedExcess.length : 0,
  }));
} catch (error) {
  console.error(`Ozon payment sync failed: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exit(1);
}
