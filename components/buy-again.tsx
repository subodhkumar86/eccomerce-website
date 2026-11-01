"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart-provider";
import { readApiResponse } from "@/lib/api-response";
import { MAX_CART_ITEMS } from "@/lib/cart";
import type { OrderQuote } from "@/lib/checkout";

export function BuyAgain({ items }: { items: { productId?: string; quantity: number }[] }) {
  const cart = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  async function restore() {
    if (busy || !cart.loaded) return;
    setBusy(true);
    setError("");
    try {
      const requested = new Map<string, number>();
      for (const item of items) {
        if (!item.productId) throw new Error("This older order cannot be added automatically. Please explore the collection.");
        requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity);
      }
      const distinct = new Set([...cart.items.map(item => item.id), ...requested.keys()]);
      if (distinct.size > MAX_CART_ITEMS) throw new Error("Your bag would exceed 30 different objects. Make room in your bag first.");
      const selection = [...requested].map(([productId, quantity]) => ({
        productId, quantity: quantity + (cart.items.find(item => item.id === productId)?.quantity ?? 0),
      }));
      if (selection.some(item => item.quantity > 99)) throw new Error("Your bag would exceed 99 pieces of an object. Review its quantity first.");
      const quote = await readApiResponse<OrderQuote>(await fetch("/api/checkout/quote", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: selection }),
      }), "Unable to check this selection. Please try again.");
      for (const product of quote.items) {
        cart.addItem({ id: product.productId, slug: product.slug, name: product.name, image: product.image, price: product.price, stock: product.stock }, requested.get(product.productId)!);
      }
      setAdded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add this selection.");
    } finally { setBusy(false); }
  }

  return <div className="buy-again">
    {added ? <p role="status">Added at current prices. <Link href="/cart">Review your bag</Link></p> :
      <button className="button-outline" disabled={busy || !cart.loaded} onClick={restore}>{busy ? "Checking availability..." : "Buy again"}</button>}
    {error && <p role="alert" className="checkout-error">{error}</p>}
  </div>;
}
