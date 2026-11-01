import { notFound } from "next/navigation";
import Link from "next/link";
import { getCatalogProducts } from "@/lib/catalog";
import { relatedProducts } from "@/lib/recommendations";
import ProductDetail from "@/components/product-detail";
import { ProductCard } from "@/components/product-card";
import { RecentlyViewed } from "@/components/recently-viewed";
import { cache } from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { publicUrl } from "@/lib/public-url";
import { productStructuredData, serializeStructuredData } from "@/lib/product-seo";

const getProduct = cache((slug: string) => prisma.product.findFirst({ where: { slug, active: true }, include: { category: true } }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
 const { slug } = await params;
 const product = await getProduct(slug);
 if (!product) return { title: "Product unavailable | Veloura", robots: { index: false, follow: false } };
 const settings = await prisma.storeSettings.findUnique({ where: { id: "main" }, select: { storeName: true } }).catch(() => null);
 const title = `${product.name} | ${settings?.storeName ?? "Veloura"}`;
 const description = product.description.replace(/\s+/g, " ").trim().slice(0, 160);
 const origin = publicUrl();
 const url = origin ? `${origin}/products/${encodeURIComponent(product.slug)}` : undefined;
 return { title, description, ...(url ? { alternates: { canonical: url } } : {}), openGraph: { title, description, images: [{ url: product.image, alt: product.name }], ...(url ? { url } : {}) }, twitter: { card: "summary_large_image", title, description, images: [product.image] } };
}
export const dynamic = "force-dynamic";
export default async function ProductPage({params}:{params:Promise<{slug:string}>}) {
 const {slug}=await params;
 const product=await getProduct(slug);
 if(!product)notFound();
 const products=await getCatalogProducts();
 const related=relatedProducts(products,product);
 return <main className="page-container"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeStructuredData(productStructuredData(product,publicUrl()))}}/><div className="breadcrumb"><Link href="/">Home</Link> / <Link href="/products">The collection</Link> / {product.name}</div><ProductDetail product={product}/>{related.length>0&&<section className="related-products"><div className="section-head"><div><div className="eyebrow">Keep the conversation going</div><h2>A few kindred objects.</h2><p>Explore available pieces from the same category, followed by objects at a similar price.</p></div><Link className="button-outline" href="/products">View collection</Link></div><div className="product-grid">{related.map((item,index)=><ProductCard key={item.id} product={item} index={index}/>)}</div></section>}<RecentlyViewed products={products} excludeId={product.id}/></main>;
}
