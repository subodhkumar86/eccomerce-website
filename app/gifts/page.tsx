import type { Metadata } from "next";
import { GiftFinder } from "@/components/gift-finder";
import { getCatalogProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "The gift finder | Veloura", description: "Find a thoughtful gift by occasion, interest and budget." };
export default async function GiftsPage() {
  const products = await getCatalogProducts();
  return <main className="page-container"><div className="breadcrumb">Home / The gift finder</div><section className="gift-intro"><div className="eyebrow">Good things, given thoughtfully</div><h1 className="page-heading">A little thought.<br/>A lasting impression.</h1><p>For a new home, a small thank-you, or simply because. Let the occasion, their interests and your budget guide you to something considered.</p></section><GiftFinder products={products}/></main>;
}
