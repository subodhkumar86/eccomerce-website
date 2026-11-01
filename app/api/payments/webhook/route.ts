import { NextResponse } from "next/server";
import { validPaymentSignature } from "@/lib/payment-security";
import { reconcilePayment } from "@/lib/payments";
import { PaymentError } from "@/lib/razorpay";

export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  const reader = req.body?.getReader(); if (!reader) return new NextResponse(null, { status: 400 });
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 65536) { await reader.cancel(); return new NextResponse(null, { status: 413 }); } chunks.push(part.value); }
  const body = Buffer.concat(chunks).toString("utf8");
  if (!validPaymentSignature(body, req.headers.get("x-razorpay-signature"), secret)) return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
  try {
    const event = JSON.parse(body);
    const paymentId = event.event === "payment.captured" ? event.payload?.payment?.entity?.id : event.event === "refund.processed" ? event.payload?.refund?.entity?.payment_id : null;
    if (paymentId) await reconcilePayment(paymentId);
    return NextResponse.json({ received: true });
  } catch (error) {
    if (error instanceof PaymentError && error.status === 404) return NextResponse.json({ received: true, ignored: true });
    return NextResponse.json({ error: "Webhook could not be reconciled. Retry delivery." }, { status: error instanceof SyntaxError ? 400 : error instanceof PaymentError ? error.status : 503 });
  }
}
