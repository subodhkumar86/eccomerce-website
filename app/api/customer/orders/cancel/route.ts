import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { customerCanCancel } from "@/lib/order-workflow";
import { rateLimit, rejectCrossOrigin } from "@/lib/request-security";

const bodySchema = z.object({ orderNumber: z.string().trim().min(1).max(100) });
const itemsSchema = z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() }));
class CancellationError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

export async function POST(req: Request) {
  const rejected = rejectCrossOrigin(req);
  if (rejected) return rejected;
  try {
    const customer = await getCustomerSession();
    if (!customer) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    if (!rateLimit(`customer-cancel:${customer.id}`, 20, 15 * 60 * 1000)) return NextResponse.json({ error: "Too many cancellation attempts. Please try again later." }, { status: 429 });
    const body = bodySchema.safeParse(await req.json().catch(() => null));
    if (!body.success) return NextResponse.json({ error: "Provide a valid order reference." }, { status: 400 });
    await prisma.$transaction(async tx => {
      const order = await tx.order.findFirst({ where: { orderNumber: body.data.orderNumber, customerId: customer.id } });
      if (!order) throw new CancellationError("Order not found.", 404);
      // Retrying a successful cancellation must never restore inventory twice.
      if (order.status === "CANCELLED" && order.paymentMethod === "COD" && order.paymentStatus === "PENDING") return;
      if (!customerCanCancel(order)) throw new CancellationError("Only new, unpaid cash-on-delivery orders can be cancelled here. This order needs store review.", 409);
      const updated = await tx.order.updateMany({
        where: { id: order.id, customerId: customer.id, status: "NEW", paymentMethod: "COD", paymentStatus: "PENDING" },
        data: { status: "CANCELLED" },
      });
      if (updated.count !== 1) throw new CancellationError("This order changed. Refresh your orders and try again.", 409);
      const items = itemsSchema.parse(JSON.parse(order.items));
      for (const item of items) await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
    });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2034") return NextResponse.json({ error: "This order changed. Refresh your orders and try again." }, { status: 409 });
    return NextResponse.json({ error: error instanceof CancellationError ? error.message : "Could not cancel this order. Refresh your orders and try again." }, { status: error instanceof CancellationError ? error.status : 503 });
  }
}
