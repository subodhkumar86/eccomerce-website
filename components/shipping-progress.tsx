"use client";
import { Truck } from "lucide-react";
import { useStoreSettings } from "@/components/store-provider";
import { money } from "@/lib/money";

export function ShippingProgress({ subtotal }: { subtotal: number }) {
  const { freeShippingAt, shippingFee } = useStoreSettings();
  const remaining = Math.max(0, freeShippingAt - subtotal);
  const free = remaining === 0 || shippingFee === 0;
  return <div className="shipping-progress"><p role="status"><Truck size={17}/>{free ? "Your order qualifies for complimentary shipping." : `You’re ${money(remaining)} away from complimentary shipping.`}</p><progress aria-label="Progress toward complimentary shipping" max={Math.max(1, freeShippingAt)} value={free ? Math.max(1, freeShippingAt) : Math.min(subtotal, freeShippingAt)}/>{!free && <span>Complimentary delivery from {money(freeShippingAt)}</span>}</div>;
}
