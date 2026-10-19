"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Heart, X } from "lucide-react";
import type { ProductView } from "@/components/product-card";
import { useCart } from "@/components/cart-provider";
import { useWishlist } from "@/components/wishlist-provider";
import { money } from "@/lib/money";

export function QuickView({ product, onClose }: { product: ProductView | null; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [added, setAdded] = useState(false);
  const { addItem, items, loaded } = useCart();
  const { ids, toggle } = useWishlist();
  useEffect(() => {
    setAdded(false);
    if (product) { if (!dialog.current?.open) dialog.current?.showModal(); }
    else dialog.current?.close();
  }, [product]);
  const inBag = items.find(item => item.id === product?.id)?.quantity ?? 0;
  const bagFull=items.length>=30&&!items.some(item=>item.id===product?.id);
  const full = Boolean(product && inBag >= Math.min(99,product.stock));
  return <dialog ref={dialog} className="quick-view-dialog" aria-labelledby="quick-view-title" onClose={onClose}>
    {product && <><button className="plain-icon quick-view-close" aria-label="Close product preview" onClick={onClose}><X/></button><div className="quick-view-layout"><img className="quick-view-image" src={product.image} alt={product.name}/><div className="quick-view-copy"><div className="eyebrow">{product.category?.name ?? "The collection"}</div><h2 id="quick-view-title">{product.name}</h2><div className="detail-price">{money(product.price)}{product.compareAtPrice && product.compareAtPrice > product.price ? <span className="old-price">{money(product.compareAtPrice)}</span> : null}</div><p>{product.description}</p><div className="availability-note">{product.stock > 0 ? `${product.stock} pieces available` : "Currently unavailable"}</div><button className="button-dark" disabled={!loaded || product.stock <= 0 || full || bagFull} onClick={() => { addItem({ id: product.id, slug: product.slug, name: product.name, price: product.price, image: product.image, stock: product.stock }); setAdded(true); }}>{product.stock <= 0 ? "Out of stock" : bagFull ? "Bag limit reached" : full ? "Available quantity in your bag" : added ? <><Check size={15}/> Add another to bag</> : "Add to bag"}</button><span role="status" className="quick-view-feedback">{added ? "Added to your bag." : ""}</span><button className="preview-save" aria-pressed={ids.includes(product.id)} onClick={() => toggle(product.id)}><Heart size={15} fill={ids.includes(product.id) ? "currentColor" : "none"}/>{ids.includes(product.id) ? "Saved to your edit" : "Save for later"}</button><Link className="comparison-link" href={`/products/${product.slug}`} onClick={onClose}>See full details →</Link></div></div></>}
  </dialog>;
}
