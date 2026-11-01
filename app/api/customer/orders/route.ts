import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/prisma";
import { createReceiptToken } from "@/lib/order-receipt";
import { customerCanCancel, orderStatuses } from "@/lib/order-workflow";

const querySchema = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  q: z.string().trim().max(100).transform(value => value.toUpperCase()).default(""),
  status: z.enum(["", ...orderStatuses]).default(""),
});
const pageSize = 10;

export async function GET(req: Request) {
  try {
    const user = await getCustomerSession();
    if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
    const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams));
    if (!parsed.success) return NextResponse.json({ error: "Check the order search, status and page number." }, { status: 400 });
    const { q, status } = parsed.data;
    // Ownership is always taken from the session, never from query parameters.
    const where = { customerId: user.id, ...(q ? { orderNumber: { contains: q } } : {}), ...(status ? { status } : {}) };
    const total = await prisma.order.count({ where });
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(parsed.data.page, pages);
    const orders = await prisma.order.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (page - 1) * pageSize, take: pageSize });
    return NextResponse.json({
      orders: await Promise.all(orders.map(async order => ({
        orderNumber: order.orderNumber, status: order.status, paymentStatus: order.paymentStatus, canCancel: customerCanCancel(order),
        total: order.total, createdAt: order.createdAt, items: JSON.parse(order.items),
        receiptToken: await createReceiptToken(order.id),
      }))),
      total, page, pages, pageSize,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch { return NextResponse.json({ error: "Unable to load your orders." }, { status: 503 }); }
}
