import crypto from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { User, Role } from "@/app/generated/prisma/client";

export const SESSION_COOKIE = "sl_dw_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SCRYPT_KEYLEN = 64;

// scrypt (Node built-in, no dependency) rather than bcrypt — avoids another
// native module after the better-sqlite3 build friction earlier in this
// project. Stored as "salt:hash", both hex.
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

// The cookie carries this random token as the Session row's id directly
// (not Prisma's default cuid, which is time-ordered and not meant to be
// unguessable) — a session is revoked by deleting its row.
export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  await prisma.session.create({
    data: { id: token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_MS) },
  });
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await prisma.session.delete({ where: { id: token } }).catch(() => {});
}

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { id: token }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
}

export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

// Route-handler guard: `const auth = await requireSession(); if (auth instanceof NextResponse) return auth;`
export async function requireSession(): Promise<User | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return user;
}

// Same pattern as requireSession(), also rejecting a session whose role
// isn't in the allowed list: `const auth = await requireRole(["ADMIN"]); if (auth instanceof NextResponse) return auth;`
export async function requireRole(allowed: Role[]): Promise<User | NextResponse> {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!allowed.includes(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return user;
}

// DISTRICT_OFFICER accounts only ever see/act on their one assigned
// district; every other role is unrestricted.
export function canAccessDistrict(user: User, districtId: string): boolean {
  return user.role !== "DISTRICT_OFFICER" || user.districtId === districtId;
}
