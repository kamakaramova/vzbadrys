const MAX_ENCODED_IMAGE_LENGTH = 7_100_000;

function matches(bytes: Buffer, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function decodeSafeImage(imageData: unknown, maxBytes = 5 * 1024 * 1024) {
  if (typeof imageData !== "string" || imageData.length > MAX_ENCODED_IMAGE_LENGTH) return null;
  const match = imageData.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  const bytes = Buffer.from(match[2], "base64");
  if (!bytes.length || bytes.length > maxBytes) return null;
  const mime = match[1];
  const valid = mime === "image/jpeg"
    ? matches(bytes, [0xff, 0xd8, 0xff])
    : mime === "image/png"
      ? matches(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      : bytes.length >= 12
        && bytes.subarray(0, 4).toString("ascii") === "RIFF"
        && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  return valid ? { bytes, mime } : null;
}
