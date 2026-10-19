export function publicUrl() {
  try { const url=new URL(process.env.SITE_URL??"");return url.protocol==="https:"?url.origin:undefined; } catch { return undefined; }
}
