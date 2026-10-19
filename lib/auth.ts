import { headers, cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { signingKey } from "@/lib/signing-key";
import { isTrustedOrigin } from "@/lib/request-security";
const COOKIE = "veloura_admin_session";
const secret = signingKey;
export async function setAdminSession(admin: { id: string; email: string }) {
  const account = await prisma.admin.findUnique({ where: { id: admin.id } });
  if (!account) throw new Error("Admin account no longer exists.");
  const credentials = createHash("sha256").update(account.passwordHash).digest("hex");
  const token = await new SignJWT({ email: admin.email, role: "admin", credentials }).setProtectedHeader({ alg: "HS256" }).setSubject(admin.id).setIssuedAt().setExpirationTime("8h").sign(secret());
  const jar = await cookies();
  jar.set(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
}
export async function clearAdminSession() {
  const jar = await cookies(); jar.set(COOKIE, "", { httpOnly: true, path: "/", maxAge: 0, sameSite: "lax" });
}
export async function getAdminSession() {
  try {
    const jar = await cookies(); const token = jar.get(COOKIE)?.value;
    if (!token) return null;
    const verified = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (verified.payload.role !== "admin" || !verified.payload.sub) return null;
    const account = await prisma.admin.findUnique({ where: { id: verified.payload.sub } });
    if (!account || verified.payload.credentials !== createHash("sha256").update(account.passwordHash).digest("hex")) return null;
    return { id: account.id, email: account.email };
  } catch { return null; }
}
export async function requireAdmin() {
  const requestHeaders = await headers();
  if (!isTrustedOrigin(requestHeaders.get("origin"), `${requestHeaders.get("x-forwarded-proto") || "http"}://${requestHeaders.get("host")}`, requestHeaders.get("sec-fetch-site"))) return { session: null, response: NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 }) };
  const session = await getAdminSession();
  if (!session) return { session: null, response: NextResponse.json({ error: "Admin authentication required." }, { status: 401 }) };
  return { session, response: null };
}
