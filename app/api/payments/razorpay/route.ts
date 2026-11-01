import { NextResponse } from "next/server";
import { z } from "zod";
import { readReceiptToken } from "@/lib/order-receipt";
import { rejectCrossOrigin, rateLimit } from "@/lib/request-security";
import { startPayment, reconcilePayment, refreshOrderPayment } from "@/lib/payments";
import { PaymentError } from "@/lib/razorpay";
import { validPaymentSignature } from "@/lib/payment-security";
import { prisma } from "@/lib/prisma";

const schema = z.object({ token: z.string().min(1).max(3000), action: z.enum(["start", "verify", "refresh"]), paymentId: z.string().regex(/^pay_[A-Za-z0-9]+$/).optional(), signature: z.string().max(128).optional() });

export async function POST(req: Request) {
  const rejected = rejectCrossOrigin(req); if (rejected) return rejected;
  try {
    const body = schema.parse(await req.json());
    const id = await readReceiptToken(body.token);
    if (!id) return NextResponse.json({ error: "Your order link expired. Reopen it from your account or contact the store." }, { status: 401 });
    if (!rateLimit(`payment:${id}`, 60, 15 * 60000)) return NextResponse.json({ error: "Too many payment checks. Please try again shortly." }, { status: 429 });
    if (body.action === "start") return NextResponse.json(await startPayment(id));
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order || order.paymentMethod !== "RAZORPAY") throw new PaymentError("This order does not use Razorpay.");
    if (body.action === "refresh") return NextResponse.json(await refreshOrderPayment(id));
    const intent = await prisma.paymentIntent.findUnique({ where: { id } });
    if (!intent?.providerOrderId || !body.paymentId || !validPaymentSignature(`${intent.providerOrderId}|${body.paymentId}`, body.signature ?? null, process.env.RAZORPAY_KEY_SECRET ?? "")) throw new PaymentError("Payment signature could not be verified.", 400);
    return NextResponse.json(await reconcilePayment(body.paymentId, id));
  } catch (error) {
    return NextResponse.json({ error: error instanceof PaymentError ? error.message : "Unable to process this payment request. Your order remains saved." }, { status: error instanceof PaymentError ? error.status : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503 });
  }
}
