export function deploymentErrors(env: Record<string, string | undefined>) {
  const errors: string[] = [];
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32 || /replace|example|changethis/i.test(env.AUTH_SECRET)) errors.push("AUTH_SECRET must be a unique random secret of at least 32 characters.");
  try { const url = new URL(env.SITE_URL ?? ""); if (url.protocol !== "https:" || url.username || url.password || /localhost|127\.0\.0\.1|your-domain\.com|example\.(com|org|net)|\.example$/.test(url.hostname) || url.pathname !== "/" || url.search || url.hash) throw new Error(); } catch { errors.push("SITE_URL must be the public HTTPS origin, without a path, query or credentials."); }
  for (const field of ["ADMIN_EMAIL", "SUPPORT_EMAIL"] as const) if (!env[field] || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env[field]!) || /your-domain\.com|example\.(com|org|net)|\.example$|\.invalid$/.test(env[field]!.toLowerCase())) errors.push(`${field} must be a valid, non-placeholder email address.`);
  if (!env.ADMIN_PASSWORD || env.ADMIN_PASSWORD.length < 12 || Buffer.byteLength(env.ADMIN_PASSWORD,"utf8") > 72 || /replace|changethis|password123/i.test(env.ADMIN_PASSWORD)) errors.push("ADMIN_PASSWORD must be unique, at least 12 characters and at most 72 UTF-8 bytes.");
  const mongo=/^mongodb(?:\+srv)?:\/\//.test(env.DATABASE_URL??"");
  if(mongo){try{const url=new URL(env.DATABASE_URL!);if(!url.hostname||url.pathname.length<2||url.username==="USERNAME"||url.password==="PASSWORD")throw new Error()}catch{errors.push("Set a valid MongoDB DATABASE_URL with a database name.")}}
  else if (!env.DATABASE_URL?.startsWith("file:") || env.DATABASE_URL.includes(":memory:") || env.DATABASE_URL.slice(5).trim().length===0) errors.push("Set a MongoDB URL or a persistent SQLite DATABASE_URL beginning with file:.");
  if(env.NETLIFY==="true"&&!mongo)errors.push("Netlify requires MongoDB; local SQLite files are not persistent in serverless functions.");
  return errors;
}
