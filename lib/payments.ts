import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { paymentAmount, paymentConfiguration, verifiedPaymentState } from "@/lib/payment-security";
import { createProviderOrder, fetchProviderPayment, fetchOrderPayments, PaymentError } from "@/lib/razorpay";

export async function onlinePaymentsAvailable() {
  if (!paymentConfiguration()) return false;
  try { await prisma.paymentIntent.findFirst({ select: { id: true } }); return true; } catch { return false; }
}

export async function startPayment(id: string) {
  if (!await onlinePaymentsAvailable()) throw new PaymentError("Online payment is unavailable. Your saved order remains unpaid.", 503);
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order || order.paymentMethod !== "RAZORPAY") throw new PaymentError("Online payment is not available for this order.");
  if (order.status === "CANCELLED" || order.paymentStatus !== "PENDING") throw new PaymentError("This order cannot accept another payment.");
  const amount = paymentAmount(order.total);
  const intent = await prisma.paymentIntent.findUnique({ where: { id } });
  if (!intent) throw new PaymentError("Payment setup is missing. Contact the store.", 503);
  if(Boolean(intent.method?.startsWith("test:"))!==Boolean(process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")))throw new PaymentError("This order was created in a different gateway mode. Contact the store before paying.");
  let providerOrderId = intent.providerOrderId;
  if (!providerOrderId) {
    const leaseToken = randomUUID();
    const claimed = await prisma.paymentIntent.updateMany({ where: { id, providerOrderId: null, leaseUntil: { lt: new Date() } }, data: { leaseToken, leaseUntil: new Date(Date.now() + 60000) } });
    if (claimed.count !== 1) throw new PaymentError("Payment setup is already in progress. Try again shortly.");
    try {
      const providerOrder = await createProviderOrder(amount, id);
      const saved = await prisma.paymentIntent.updateMany({ where: { id, leaseToken }, data: { providerOrderId: providerOrder.id, leaseToken: null, leaseUntil: new Date(0) } });
      if (saved.count !== 1) throw new PaymentError("Payment setup changed. Please retry.");
      providerOrderId = providerOrder.id;
    } catch (error) {
      await prisma.paymentIntent.updateMany({ where: { id, leaseToken }, data: { leaseToken: null, leaseUntil: new Date(0) } });
      throw error;
    }
  }
  const current = await prisma.order.findUnique({ where: { id } });
  if (current?.status === "CANCELLED" || current?.paymentStatus !== "PENDING") throw new PaymentError("This order cannot accept another payment.");
  return { key: process.env.RAZORPAY_KEY_ID!, orderId: providerOrderId, amount, currency: "INR", orderNumber: order.orderNumber, customer: { name: order.customerName, email: order.email, contact: order.phone }, testMode: process.env.RAZORPAY_KEY_ID!.startsWith("rzp_test_") };
}

export async function reconcilePayment(paymentId: string, expectedOrderId?: string) {
  const payment = await fetchProviderPayment(paymentId);
  if (payment.id !== paymentId) throw new PaymentError("Payment verification failed.");
  const intent = payment.order_id ? await prisma.paymentIntent.findFirst({ where: { providerOrderId: payment.order_id } }) : null;
  if (!intent) throw new PaymentError("This payment is not managed by the store.", 404);
  if (expectedOrderId && intent.id !== expectedOrderId) throw new PaymentError("This payment does not belong to the order.");
  return prisma.$transaction(async tx => {
    const order = await tx.order.findUnique({ where: { id: intent.id } });
    if (!order || order.paymentMethod !== "RAZORPAY") throw new PaymentError("Payment order not found.");
    const state = verifiedPaymentState(payment, intent.providerOrderId!, order.total);
    if (!state) throw new PaymentError("Payment is not yet captured, or its amount could not be verified. Refresh shortly.");
    await tx.paymentIntent.update({ where: { id: intent.id }, data: { paymentId: payment.id, method: (intent.method?.startsWith("test:")?"test:":"")+(payment.method??"online") } });
    await tx.order.updateMany({ where: { id: order.id, ...(state === "PAID" ? { paymentStatus: "PENDING" } : { paymentStatus: { not: "REFUNDED" } }) }, data: { paymentStatus: state } });
    return { paymentStatus: (await tx.order.findUnique({ where: { id: order.id } }))!.paymentStatus, cancelled: order.status === "CANCELLED" };
  });
}

export async function refreshOrderPayment(id: string) {
  const intent = await prisma.paymentIntent.findUnique({ where: { id } });
  if (!intent?.providerOrderId) return { paymentStatus: "PENDING" };
  if (intent.paymentId) return reconcilePayment(intent.paymentId, id);
  const payments = await fetchOrderPayments(intent.providerOrderId);
  const captured = payments.find(payment => payment.status === "captured" || payment.status === "refunded");
  return captured ? reconcilePayment(captured.id, id) : { paymentStatus: "PENDING" };
}
