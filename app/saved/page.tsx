import type { Metadata } from "next";
import { getCatalogProducts } from "@/lib/catalog";
import { SavedCollection } from "@/components/saved-collection";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your saved edit | Veloura", description: "Revisit the objects you love and move your favourites to your bag." };
export default async function SavedPage() {
  const products = await getCatalogProducts();
  return <main className="page-container"><div className="breadcrumb">Home / Your saved edit</div><div className="saved-intro"><div className="eyebrow">A collection of your own</div><h1 className="page-heading">For another moment.</h1><p>Keep the objects you love close. Your saved edit stays in this browser, ready when you are.</p></div><SavedCollection products={products}/></main>;
}
