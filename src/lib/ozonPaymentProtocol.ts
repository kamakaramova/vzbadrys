/**
 * Ozon returns both legacy values (for example, `Completed`) and enum-style
 * values (for example, `STATUS_PAID`) from its payment endpoints.
 */
export function normalizeOzonPaymentProviderStatus(status: string) {
  return status.trim().toLowerCase().replace(/^status_/, "");
}
