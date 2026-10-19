import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export const orderItemsSchema = z.array(z.object({ productId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(99) })).min(1).max(30);
export const customerSchema = z.object({
  customerName: z.string().trim().min(2).max(100), email: z.string().trim().email().max(200).transform(value => value.toLowerCase()),
  phone: z.string().trim().min(7).max(30), address: z.string().trim().min(5).max(250), city: z.string().trim().min(2).max(100), postalCode: z.string().trim().min(4).max(15),
  notes: z.string().trim().max(500).optional().default(""), items: orderItemsSchema,
  idempotencyKey: z.string().uuid().optional(), expectedTotal: z.number().int().min(0).optional(),
});
export class CheckoutError extends Error {}
export async function quoteOrder(requestedItems: z.infer<typeof orderItemsSchema>, db: Prisma.TransactionClient = prisma) {
  const requested = new Map<string, number>();
  for (const item of requestedItems) requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity);
  if ([...requested.values()].some(quantity => quantity > 99)) throw new CheckoutError("A maximum of 99 pieces per object is allowed.");
  const products = await db.product.findMany({ where: { id: { in: [...requested.keys()] }, active: true }, orderBy: { id: "asc" } });
  if (products.length !== requested.size) throw new CheckoutError("An object is no longer available. Review your bag and remove unavailable items.");
  for (const product of products) if (product.stock < requested.get(product.id)!) throw new CheckoutError(`Only ${product.stock} of ${product.name} remain. Update its quantity in your bag.`);
  const items = products.map(product => ({ productId: product.id, slug: product.slug, name: product.name, image: product.image, price: product.price, stock: product.stock, quantity: requested.get(product.id)! }));
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const settings = await db.storeSettings.findUnique({ where: { id: "main" } });
  const shipping = subtotal >= (settings?.freeShippingAt ?? 5000) ? 0 : (settings?.shippingFee ?? 250);
  return { items, subtotal, shipping, total: subtotal + shipping };
}
export type OrderQuote = Awaited<ReturnType<typeof quoteOrder>>;
