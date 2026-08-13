import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

const COOKIE_NAME = "vzb_admin_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60;

function secret() {
  return process.env.ADMIN_PASSWORD || "";
}

function signature(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function verifyAdminPassword(value: unknown) {
  const expected = secret();
  return typeof value === "string" && Boolean(expected) && safeEqual(value, expected);
}

export function createAdminSession() {
  const payload = `${Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS}.${crypto.randomUUID()}`;
  return `${payload}.${signature(payload)}`;
}

function validSession(token: string) {
  const parts = token.split(".");
  if (parts.length !== 3 || !secret()) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  if (!safeEqual(parts[2], signature(payload))) return false;
  const expiresAt = Number(parts[0]);
  return Number.isSafeInteger(expiresAt) && expiresAt > Math.floor(Date.now() / 1000);
}

function sameOrigin(request: NextRequest) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
  const origin = request.headers.get("origin");
  if (!origin) return true; // server-side jobs do not send Origin
  try {
    const expectedHost = request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host;
    return new URL(origin).host === expectedHost;
  } catch {
    return false;
  }
}

export function isAdminAuthorized(request: NextRequest) {
  if (!sameOrigin(request)) return false;
  const session = request.cookies.get(COOKIE_NAME)?.value || "";
  if (session && validSession(session)) return true;
  // Kept for the local payment-status systemd job and safe rollout compatibility.
  return verifyAdminPassword(request.headers.get("x-admin-password"));
}

export function setAdminSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, createAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
}
