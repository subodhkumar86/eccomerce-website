import { SignJWT, jwtVerify } from "jose";
import { signingKey } from "@/lib/signing-key";
export function createReceiptToken(orderId: string) {
  return new SignJWT({ purpose: "order-receipt" }).setProtectedHeader({ alg: "HS256" }).setSubject(orderId).setIssuedAt().setExpirationTime("7d").sign(signingKey());
}
export async function readReceiptToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, signingKey(), { algorithms: ["HS256"] });
    return payload.purpose === "order-receipt" && payload.sub ? payload.sub : null;
  } catch { return null; }
}
