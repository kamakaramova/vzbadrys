export function phoneDigits(value: unknown) {
  const original = String(value ?? "").trim();
  let digits = original.replace(/\D/g, "");
  if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
  if (digits.length === 10 && digits.startsWith("9")) digits = `7${digits}`;
  return digits;
}

export function formatPhoneForDisplay(value: unknown) {
  const original = String(value ?? "").trim();
  const digits = phoneDigits(original);

  if (digits.length === 11 && digits.startsWith("7")) {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }

  return original;
}
