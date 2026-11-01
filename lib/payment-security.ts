import { createHmac, timingSafeEqual } from "node:crypto";

export function validPaymentSignature(body: string, signature: string | null, secret: string) {
  if (!secret || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export function paymentAmount(rupees: number) {
  const amount = rupees * 100;
  if (!Number.isSafeInteger(amount) || amount < 100 || amount > 2147483647) throw new Error("This total is not supported for online payment. Choose cash on delivery or contact the store.");
  return amount;
}

export function paymentConfiguration(env: Record<string, string | undefined> = process.env) {
  return env.RAZORPAY_ENABLED === "true" && /^rzp_(test|live)_[A-Za-z0-9]+$/.test(env.RAZORPAY_KEY_ID ?? "") && (env.RAZORPAY_KEY_SECRET?.length ?? 0) >= 16 && (env.RAZORPAY_WEBHOOK_SECRET?.length ?? 0) >= 16;
}

type ProviderPayment = { id: string; order_id: string | null; amount: number; currency: string; status: string; captured: boolean; amount_refunded?: number; method?: string };
export function verifiedPaymentState(payment: ProviderPayment, providerOrderId: string, total: number): "PAID" | "REFUNDED" | null {
  if (payment.order_id !== providerOrderId || payment.amount !== paymentAmount(total) || payment.currency !== "INR" || payment.captured !== true) return null;
  if (payment.status === "refunded" && payment.amount_refunded === payment.amount) return "REFUNDED";
  return payment.status === "captured" ? "PAID" : null;
}
