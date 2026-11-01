import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readReceiptToken } from "@/lib/order-receipt";
import { rejectCrossOrigin, rateLimit } from "@/lib/request-security";

export async function POST(req: Request) {
  const rejected = rejectCrossOrigin(req); if (rejected) return rejected;
  try {
    const body = z.object({ token: z.string().max(3000), reference: z.string().trim().regex(/^[A-Za-z0-9 -]{6,80}$/) }).parse(await req.json());
    const id = await readReceiptToken(body.token);
    if (!id) return NextResponse.json({ error: "This order link is invalid or expired." }, { status: 401 });
    if (!rateLimit(`upi-reference:${id}`, 10, 60 * 60000)) return NextResponse.json({ error: "Too many reference updates. Please try again later." }, { status: 429 });
    const saved = await prisma.$transaction(async tx => {
      const order = await tx.order.findUnique({ where: { id } });
      if (!order || order.paymentMethod !== "UPI" || order.paymentStatus !== "PENDING" || order.status === "CANCELLED") return false;
      await tx.paymentIntent.update({ where: { id }, data: { upiReference: body.reference, upiSubmittedAt: new Date() } });
      return true;
    });
    return saved ? NextResponse.json({ ok: true, message: "Reference saved. Payment is awaiting the store's bank verification." }) : NextResponse.json({ error: "This order cannot accept a payment reference." }, { status: 409 });
  } catch (error) { return NextResponse.json({ error: "Unable to save the payment reference. Check it and retry." }, { status: error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503 }); }
}
