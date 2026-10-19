import { NextResponse } from "next/server";

export function isSameOrigin(requestOrigin: string | null, target: string, fetchSite?: string | null) {
  if (fetchSite === "cross-site") return false;
  if (!requestOrigin) return true; // Non-browser API clients do not send Origin.
  try { return new URL(requestOrigin).origin === new URL(target).origin; } catch { return false; }
}
export function rejectCrossOrigin(req: Request) {
  return isTrustedOrigin(req.headers.get("origin"), req.url, req.headers.get("sec-fetch-site")) ? null : NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
}

// A reverse proxy may reconstruct the request using an internal host/protocol.
// Only the explicitly configured public origin may supplement that request URL;
// never trust an arbitrary forwarded host supplied by a caller.
export function isTrustedOrigin(origin:string|null,target:string,fetchSite:string|null|undefined,canonical=process.env.SITE_URL){
  if(isSameOrigin(origin,target,fetchSite))return true;
  if(!canonical)return false;
  try{const url=new URL(canonical);return url.protocol==="https:"&&!url.username&&!url.password&&isSameOrigin(origin,url.origin,fetchSite)}catch{return false}
}

// Bounded per-process throttling for the single-server SQLite deployment.
const attempts = new Map<string, { count: number; until: number }>();
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()) {
  for (const [id, value] of attempts) if (value.until <= now) attempts.delete(id);
  const value = attempts.get(key) ?? { count: 0, until: now + windowMs };
  if (value.count >= limit) return false;
  if (attempts.size >= 10000 && !attempts.has(key)) return false;
  value.count++; attempts.set(key, value); return true;
}
