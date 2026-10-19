"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, ShoppingBag } from "lucide-react";
import { ProductCard, type ProductView } from "@/components/product-card";
import { useWishlist } from "@/components/wishlist-provider";
import { useCart } from "@/components/cart-provider";
import { availableSavedProducts } from "@/lib/saved-products";

export function SavedCollection({ products }: { products: ProductView[] }) {
  const { ids, loaded, remove } = useWishlist();
  const { items, addItem } = useCart();
  const [message, setMessage] = useState("");
  const saved = products.filter(product => ids.includes(product.id));
  const available = availableSavedProducts(saved, items);
  const existing = available.filter(product=>items.some(item=>item.id===product.id));
  const eligible = [...existing,...available.filter(product=>!items.some(item=>item.id===product.id)).slice(0,Math.max(0,30-items.length))];
  const unavailable = ids.filter(id => !products.some(product => product.id === id));
  function addSaved() {
    eligible.forEach(product => addItem({ id: product.id, slug: product.slug, name: product.name, price: product.price, image: product.image, stock: product.stock }));
    setMessage(`${eligible.length} ${eligible.length === 1 ? "object added" : "objects added"} to your bag. Your favourites are still saved.`);
  }
  if (!loaded) return <p className="loading-line" role="status">Opening your saved edit…</p>;
  return <>{saved.length > 0 ? <><div className="saved-toolbar"><span>{saved.length} {saved.length === 1 ? "object" : "objects"} in your edit</span><button className="button-dark" disabled={!eligible.length} onClick={addSaved}><ShoppingBag size={14}/>{eligible.length ? "Add available favourites to bag" : "No available items to add"}</button></div><p className="saved-feedback" role="status">{message}</p><div className="product-grid">{saved.map((product, index) => <ProductCard product={product} key={product.id} index={index}/>)}</div><div className="saved-next"><Link href="/cart" className="button-outline">View your bag <ArrowRight size={14}/></Link><Link href="/products">Keep discovering →</Link></div></> : <div className="empty-state"><Heart size={34} strokeWidth={1}/><h2>Your next favourite belongs here.</h2><p>Tap the heart on any object to build an edit of your own.</p><Link href="/products" className="button-dark">Explore the collection <ArrowRight size={14}/></Link></div>}{unavailable.length > 0 && <div className="saved-unavailable"><p>{unavailable.length} saved {unavailable.length === 1 ? "object is" : "objects are"} no longer listed in this collection.</p><button className="reset-filters" onClick={() => unavailable.forEach(remove)}>Remove unlisted favourites</button></div>}</>;
}
