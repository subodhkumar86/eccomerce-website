import { z } from "zod";
import { paymentConfiguration } from "@/lib/payment-security";

export class PaymentError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}

const providerOrder = z.object({ id: z.string().regex(/^order_[A-Za-z0-9]+$/), amount: z.number().int(), currency: z.string(), receipt: z.string().nullable().optional() });
const providerPayment = z.object({ id: z.string().regex(/^pay_[A-Za-z0-9]+$/), order_id: z.string().nullable(), amount: z.number().int(), currency: z.string(), status: z.string(), captured: z.boolean(), amount_refunded: z.number().int().optional(), method: z.string().optional() });

function apiBase() {
  // Only fake test keys may use the local fixture server. Real credentials always go to Razorpay.
  const fixture = process.env.VELOURA_PAYMENT_TEST_BASE_URL;
  if (fixture && process.env.RAZORPAY_KEY_ID === "rzp_test_fixture") {
    const url = new URL(fixture);
    if (url.protocol === "http:" && url.hostname === "127.0.0.1" && !url.username && !url.password) return url.origin;
  }
  return "https://api.razorpay.com/v1";
}

async function request(path: string, data?: unknown) {
  if (!paymentConfiguration({ ...process.env, RAZORPAY_ENABLED: "true" })) throw new PaymentError("Online payment is not configured. Your order remains unpaid.", 503);
  try {
    const response = await fetch(apiBase() + path, { method: data === undefined ? "GET" : "POST", headers: { Authorization: "Basic " + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64"), "Content-Type": "application/json" }, ...(data === undefined ? {} : { body: JSON.stringify(data) }), cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error();
    return await response.json();
  } catch { throw new PaymentError("The payment provider is unavailable. Your order is saved; try payment again shortly.", 503); }
}

export async function createProviderOrder(amount: number, receipt: string) {
  const previous = z.object({ items: z.array(providerOrder).max(100) }).parse(await request(`/orders?receipt=${encodeURIComponent(receipt)}&count=100`)).items.filter(order => order.receipt === receipt);
  if (previous.length) {
    const matching = previous.find(order => order.amount === amount && order.currency === "INR");
    if (!matching) throw new PaymentError("The stored gateway amount does not match this order. Contact the store.", 503);
    return matching;
  }
  const order = providerOrder.parse(await request("/orders", { amount, currency: "INR", receipt, partial_payment: false }));
  if (order.amount !== amount || order.currency !== "INR" || order.receipt !== receipt) throw new PaymentError("The payment provider returned an unexpected order.", 503);
  return order;
}
export async function fetchProviderPayment(id: string) {
  if (!/^pay_[A-Za-z0-9]+$/.test(id)) throw new PaymentError("Invalid payment reference.", 400);
  return providerPayment.parse(await request(`/payments/${id}`));
}
export async function fetchOrderPayments(id: string) {
  if (!/^order_[A-Za-z0-9]+$/.test(id)) throw new PaymentError("Invalid payment order.", 400);
  return z.object({ items: z.array(providerPayment).max(100) }).parse(await request(`/orders/${id}/payments`)).items;
}
