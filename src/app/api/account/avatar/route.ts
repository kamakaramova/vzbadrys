import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/loyalty";
import { getServerSupabase } from "@/lib/supabaseServer";
import { decodeSafeImage } from "@/lib/imageSecurity";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const BUCKET = "review-media";
const MAX_FILE_SIZE = 5 * 1024 * 1024;

function bearerToken(request: NextRequest) {
  return request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") || null;
}

function ownedAvatarPath(userId: string, value: unknown) {
  const path = String(value || "");
  return path.startsWith(`avatars/${userId}/`) ? path : "";
}

export async function POST(request: NextRequest) {
  const limit = rateLimit(request, "avatar-upload", 10, 60 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Слишком много попыток. Попробуйте позже" }, { status: 429, headers: { "retry-after": String(limit.retryAfter) } });
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "База данных не настроена" }, { status: 503 });

  const user = await getAuthenticatedUser(db, bearerToken(request));
  if (!user) return NextResponse.json({ error: "Необходимо войти в аккаунт" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const image = decodeSafeImage(body.imageData, MAX_FILE_SIZE);
  if (!image) {
    return NextResponse.json({ error: "Фото должно быть не больше 5 МБ" }, { status: 400 });
  }

  const { bytes, mime } = image;
  const extension = mime === "image/jpeg" ? "jpg" : mime.split("/")[1];
  const path = `avatars/${user.id}/${randomUUID()}.${extension}`;
  const upload = await db.storage.from(BUCKET).upload(path, bytes, {
    contentType: mime,
    cacheControl: "31536000",
    upsert: false,
  });
  if (upload.error) return NextResponse.json({ error: "Не удалось загрузить фото" }, { status: 500 });

  const avatarUrl = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  const previousPath = ownedAvatarPath(user.id, user.user_metadata?.avatarPath);
  const metadata = { ...(user.user_metadata || {}), avatar: avatarUrl, avatarPath: path };
  const updated = await db.auth.admin.updateUserById(user.id, { user_metadata: metadata });
  if (updated.error) {
    await db.storage.from(BUCKET).remove([path]);
    return NextResponse.json({ error: "Не удалось сохранить фото профиля" }, { status: 500 });
  }

  if (previousPath && previousPath !== path) await db.storage.from(BUCKET).remove([previousPath]);
  return NextResponse.json({ avatarUrl });
}

export async function DELETE(request: NextRequest) {
  const db = getServerSupabase();
  if (!db) return NextResponse.json({ error: "База данных не настроена" }, { status: 503 });

  const user = await getAuthenticatedUser(db, bearerToken(request));
  if (!user) return NextResponse.json({ error: "Необходимо войти в аккаунт" }, { status: 401 });

  const previousPath = ownedAvatarPath(user.id, user.user_metadata?.avatarPath);
  const metadata = { ...(user.user_metadata || {}), avatar: "", avatarPath: "" };
  const updated = await db.auth.admin.updateUserById(user.id, { user_metadata: metadata });
  if (updated.error) return NextResponse.json({ error: "Не удалось удалить фото профиля" }, { status: 500 });

  if (previousPath) await db.storage.from(BUCKET).remove([previousPath]);
  return NextResponse.json({ ok: true });
}
