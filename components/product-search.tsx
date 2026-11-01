"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { StoreImage } from "@/components/store-image";
import { readApiResponse } from "@/lib/api-response";
import { money } from "@/lib/money";
import { useHydrated } from "@/lib/use-hydrated";

type Result = { id: string; name: string; slug: string; image: string; price: number; stock: number; category: { name: string } | null };
type Results = { products: Result[]; hasMore: boolean; query: string };

export function ProductSearch() {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const previousPathname = useRef(pathname);
  const term = query.trim();
  const current = results?.query === term ? results : null;

  useEffect(() => {
    if (previousPathname.current !== pathname) {
      previousPathname.current = pathname;
      setOpen(false);
    }
  }, [pathname]);
  useEffect(() => {
    if (open) { if (!dialog.current?.open) dialog.current?.showModal(); input.current?.focus(); }
    else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.isComposing || document.querySelector("dialog[open]")) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
      if ((event.key.toLowerCase() === "k" && (event.ctrlKey || event.metaKey)) || (event.key === "/" && !event.ctrlKey && !event.metaKey)) { event.preventDefault(); setOpen(true); }
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    if (!open || term.length < 2) return () => controller.abort();
    const timer = setTimeout(async () => {
      try {
        const data = await readApiResponse<{ products: Result[]; hasMore: boolean }>(await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal, cache: "no-store" }), "Unable to search the collection.");
        if (!controller.signal.aborted) setResults({ ...data, query: term });
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Please try again."); }
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term, open, retry]);

  function move(event: React.KeyboardEvent) {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const links = [...(list.current?.querySelectorAll<HTMLAnchorElement>("a") ?? [])];
    if (!links.length) return;
    event.preventDefault();
    const index = links.findIndex(link => link === document.activeElement);
    if (event.key === "ArrowUp" && index <= 0) input.current?.focus();
    else links[Math.min(links.length - 1, index + (event.key === "ArrowDown" ? 1 : -1))]?.focus();
  }

  return <>
    <button className="icon-link search-trigger" disabled={!hydrated} aria-label="Search products" aria-haspopup="dialog" onClick={() => { setResults(null); setOpen(true); }}><Search size={17} /><span className="hide-mobile">Discover</span></button>
    <dialog ref={dialog} className="product-search-dialog" aria-labelledby="product-search-title" onClose={() => { if (!dialog.current?.open) { setOpen(false); setResults(null); } }} onClick={event => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) setOpen(false); } }}>
      <div className="search-dialog-heading"><div><div className="eyebrow">Find your next favourite</div><h2 id="product-search-title">Search the collection</h2></div><button className="plain-icon" aria-label="Close product search" onClick={() => setOpen(false)}><X size={22} /></button></div>
      <form onSubmit={event => { event.preventDefault(); if (term.length >= 2) window.location.assign(`/products?q=${encodeURIComponent(term)}`); }}>
        <label htmlFor="quick-product-search" className="sr-only">Search objects, materials or collections</label>
        <div className="product-search-input"><Search size={19} aria-hidden="true" /><input ref={input} id="quick-product-search" type="search" autoComplete="off" maxLength={100} placeholder="Objects, materials, collections..." value={query} onChange={event => { setQuery(event.target.value); setError(""); }} onKeyDown={move} /><button className="button-dark" disabled={term.length < 2}>Search</button></div>
      </form>
      <div className="product-search-results" aria-busy={open && term.length >= 2 && !current && !error}>
        {term.length < 2 ? <p className="search-hint">Enter at least two characters. Use ↓ to browse results, Enter to open and Escape to close.</p> : error ? <div><p role="alert" className="admin-error">{error}</p><button className="button-outline" onClick={() => { setResults(null); setRetry(value => value + 1); }}>Retry search</button></div> : !current ? <p role="status">Searching the collection...</p> : <>
          <p role="status" className="search-hint">{current.products.length ? `${current.hasMore ? "Showing the first " : ""}${current.products.length} matching ${current.products.length === 1 ? "object" : "objects"}.` : "No matching objects. Try another name, material or collection."}</p>
          <div ref={list} className="search-result-list" onKeyDown={move}>{current.products.map(product => <Link key={product.id} href={`/products/${encodeURIComponent(product.slug)}`} className="search-result" onClick={() => setOpen(false)}><StoreImage src={product.image} alt="" loading="lazy" /><span><small>{product.category?.name ?? "The collection"}</small><strong>{product.name}</strong><span>{product.stock > 0 ? "Available" : "Currently unavailable"}</span></span><b>{money(product.price)}</b></Link>)}</div>
          {current.products.length > 0 && <Link className="search-all-results" href={`/products?q=${encodeURIComponent(term)}`} onClick={() => setOpen(false)}>View all results in the collection →</Link>}
        </>}
      </div>
    </dialog>
  </>;
}
