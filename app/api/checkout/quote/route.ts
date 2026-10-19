import { NextResponse } from "next/server";
import { z } from "zod";
import { CheckoutError, orderItemsSchema, quoteOrder } from "@/lib/checkout";
import { rejectCrossOrigin } from "@/lib/request-security";
export async function POST(req: Request) {
  const rejected = rejectCrossOrigin(req); if (rejected) return rejected;
  try { const { items } = z.object({ items: orderItemsSchema }).parse(await req.json()); return NextResponse.json(await quoteOrder(items)); }
  catch (error) { return NextResponse.json({ error: error instanceof CheckoutError ? error.message : error instanceof z.ZodError || error instanceof SyntaxError ? "Check your bag items and quantities." : "Checkout is temporarily unavailable. Please try again." }, { status: error instanceof CheckoutError ? 409 : error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 503 }); }
}
