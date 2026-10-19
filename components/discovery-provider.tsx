"use client";
import { useHydrated } from "@/lib/use-hydrated";

import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Columns3, X } from "lucide-react";
import type { ProductView } from "@/components/product-card";
import { toggleComparison, rememberProduct } from "@/lib/discovery";
import { QuickView } from "@/components/quick-view";
import { money } from "@/lib/money";

type Discovery = { preview: (product: ProductView) => void; compared: ProductView[]; toggleCompare: (product: ProductView) => void; recent: string[]; recordView: (id: string) => void; clearHistory: () => void };
const Context = createContext<Discovery | null>(null);

export function DiscoveryProvider({ children }: { children: React.ReactNode }) {
  const [previewProduct,setPreviewProduct] = useState<ProductView | null>(null);
  const closePreview = useCallback(() => setPreviewProduct(null), []);
  const [compared, setCompared] = useState<ProductView[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    startTransition(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem("veloura-recent") ?? "[]");
      if (Array.isArray(saved)) setRecent(previous => [...new Set([...previous, ...saved.filter((id): id is string => typeof id === "string")])].slice(0, 8));
    } catch {}
    setLoaded(true);
    });
  }, []);
  useEffect(() => { if (loaded) try { localStorage.setItem("veloura-recent", JSON.stringify(recent)); } catch {} }, [recent, loaded]);
  const recordView = useCallback((id: string) => startTransition(() => setRecent(previous => rememberProduct(previous, id))), []);
  const clearHistory = useCallback(() => setRecent([]), []);
  const toggleCompare=useCallback((product:ProductView)=>setCompared(previous=>toggleComparison(previous,product)),[]);
  const preview=useCallback((product:ProductView)=>{recordView(product.id);setPreviewProduct(product)},[recordView]);
  const context=useMemo(()=>({preview,compared,toggleCompare,recent,recordView,clearHistory}),[preview,compared,toggleCompare,recent,recordView,clearHistory]);
  return <Context.Provider value={context}>
    {children}
    <QuickView product={previewProduct} onClose={closePreview}/>
    {compared.length > 0 && <div className="compare-tray" role="region" aria-label="Product comparison">
      <div><Columns3 size={18}/><span><strong>{compared.length} of 3</strong> objects selected</span></div>
      <button className="button-dark" disabled={compared.length < 2} onClick={() => dialog.current?.showModal()}>Compare <ArrowRight size={14}/></button>
      <button className="plain-icon" aria-label="Clear comparison" onClick={() => { dialog.current?.close(); setCompared([]); }}><X size={18}/></button>
    </div>}
    <dialog ref={dialog} className="comparison-dialog" aria-labelledby="comparison-title">
      <div className="comparison-heading"><div><div className="eyebrow">Find your favourite</div><h2 id="comparison-title">A closer look.</h2></div><button className="plain-icon" aria-label="Close comparison" onClick={() => dialog.current?.close()}><X/></button></div>
      <div className="comparison-scroll"><table className="comparison-table"><caption className="sr-only">Compare selected objects by price, category, description and availability</caption><thead><tr><th scope="col">The details</th>{compared.map(product => <th scope="col" key={product.id}><img src={product.image} alt=""/><Link onClick={() => dialog.current?.close()} href={`/products/${product.slug}`}>{product.name}</Link></th>)}</tr></thead><tbody>
        <tr><th scope="row">Price</th>{compared.map(p => <td key={p.id}>{money(p.price)}</td>)}</tr>
        <tr><th scope="row">Category</th>{compared.map(p => <td key={p.id}>{p.category?.name ?? "The collection"}</td>)}</tr>
        <tr><th scope="row">The story</th>{compared.map(p => <td key={p.id}>{p.description}</td>)}</tr>
        <tr><th scope="row">Availability</th>{compared.map(p => <td key={p.id}>{p.stock > 0 ? `${p.stock} pieces available` : "Out of stock"}</td>)}</tr>
        <tr><th scope="row">Explore</th>{compared.map(p => <td key={p.id}><Link className="comparison-link" onClick={() => dialog.current?.close()} href={`/products/${p.slug}`}>View object →</Link></td>)}</tr>
      </tbody></table></div>
    </dialog>
  </Context.Provider>;
}
export function useDiscovery() { const hydrated=useHydrated(); const value = useContext(Context); if (!value) throw new Error("DiscoveryProvider is required"); return hydrated?value:{...value,compared:[],recent:[]}; }
