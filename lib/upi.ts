export function validUpiId(value: string | undefined) {
  return Boolean(value && /^[A-Za-z0-9][A-Za-z0-9._-]{1,254}@[A-Za-z][A-Za-z0-9.-]{1,63}$/.test(value));
}
export function upiAvailable(env: Record<string, string | undefined> = process.env) {
  return env.UPI_ENABLED === "true" && validUpiId(env.UPI_ID);
}
export function upiPaymentUri({ vpa, name, total, reference }: { vpa: string; name: string; total: number; reference: string }) {
  if (!validUpiId(vpa) || !name.trim() || !Number.isSafeInteger(total) || total < 1) throw new Error("UPI payment details are unavailable.");
  const params = new URLSearchParams({ pa: vpa, pn: name.trim().slice(0, 100), am: total.toFixed(2), cu: "INR", tn: reference.slice(0, 80), tr: reference.slice(0, 80) });
  return "upi://pay?" + params.toString();
}
