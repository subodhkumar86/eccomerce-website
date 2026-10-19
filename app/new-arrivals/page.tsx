import Link from "next/link";
import { getCatalogProducts } from "@/lib/catalog";
import { ProductCard } from "@/components/product-card";
export const dynamic="force-dynamic";
export const metadata={title:"New arrivals | Veloura",description:"Browse the latest additions to the current collection."};
export default async function NewArrivals(){const products=(await getCatalogProducts()).slice(0,12);return <main className="page-container"><div className="eyebrow">The latest chapter</div><h1 className="page-heading">Fresh perspective.</h1><p className="page-intro">The most recently added objects in the current collection, newest first. A fresh starting point for your next favourite.</p><div className="product-grid">{products.map((product,index)=><ProductCard key={product.id} product={product} index={index}/>)}</div>{!products.length&&<p className="no-results">The next edit is on its way. Check back soon.</p>}<div className="page-end-action"><Link className="button-outline" href="/products">Browse the complete collection</Link></div></main>}
