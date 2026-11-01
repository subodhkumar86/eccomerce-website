"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useStoreSettings } from "@/components/store-provider";

export function ReceiptActions({ orderNumber }: { orderNumber: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const settings = useStoreSettings();
  return <div className="receipt-actions">
    <button className="button-outline" onClick={() => startTransition(() => router.refresh())} disabled={pending}>{pending ? "Refreshing..." : "Refresh status"}</button>
    <button className="button-outline" onClick={() => window.print()}>Print / save receipt</button>
    <a className="button-outline" href={`mailto:${settings.supportEmail}?subject=${encodeURIComponent(`Help with order ${orderNumber}`)}`}>Ask about this order</a>
    <span className="sr-only" role="status">{pending ? "Refreshing order status" : ""}</span>
  </div>;
}
