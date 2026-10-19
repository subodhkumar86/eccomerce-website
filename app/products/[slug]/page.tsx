import { notFound } from "next/navigation";
import Link from "next/link";
import { getCatalogProducts } from "@/lib/catalog";
import { relatedProducts } from "@/lib/recommendations";
import ProductDetail from "@/components/product-detail";
import { ProductCard } from "@/components/product-card";
import { RecentlyViewed } from "@/components/recently-viewed";
export const dynamic = "force-dynamic";
export default async function ProductPage({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;
 const products=await getCatalogProducts();
 const product=products.find(item=>item.slug===slug);
 if(!product)notFound();
 const related=relatedProducts(products,product);
 return <main className="page-container"><div className="breadcrumb"><Link href="/">Home</Link> / <Link href="/products">The collection</Link> / {product.name}</div><ProductDetail product={product}/>{related.length>0&&<section className="related-products"><div className="section-head"><div><div className="eyebrow">Keep the conversation going</div><h2>A few kindred objects.</h2><p>Explore available pieces from the same category, followed by objects at a similar price.</p></div><Link className="button-outline" href="/products">View collection</Link></div><div className="product-grid">{related.map((item,index)=><ProductCard key={item.id} product={item} index={index}/>)}</div></section>}<RecentlyViewed products={products} excludeId={product.id}/></main>;
}
