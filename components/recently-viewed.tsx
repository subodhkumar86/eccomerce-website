"use client";
import { useDiscovery } from "@/components/discovery-provider";
import { ProductCard, type ProductView } from "@/components/product-card";

export function RecentlyViewed({ products, excludeId }: { products: ProductView[]; excludeId?: string }) {
  const { recent, clearHistory } = useDiscovery();
  const viewed = recent.filter(id => id !== excludeId).map(id => products.find(product => product.id === id)).filter((product): product is ProductView => Boolean(product)).slice(0, 4);
  if (!viewed.length) return null;
  return <section className="recently-viewed"><div className="section-head"><div><div className="eyebrow">Pick up where you left off</div><h2>Still on your mind?</h2></div><button className="reset-filters" onClick={clearHistory}>Clear viewing history</button></div><div className="product-grid">{viewed.map((product, index) => <ProductCard key={product.id} product={product} index={index}/>)}</div></section>;
}
