export function signingKey() {
  const value = process.env.AUTH_SECRET;
  if (!value || value.length < 32 || value.includes("replace-with")) throw new Error("Configure a unique AUTH_SECRET of at least 32 characters.");
  return new TextEncoder().encode(value);
}
