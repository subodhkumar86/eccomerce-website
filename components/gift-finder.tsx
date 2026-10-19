"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Gift, Home, Sparkles, Heart } from "lucide-react";
import { ProductCard, type ProductView } from "@/components/product-card";
import { findGifts } from "@/lib/recommendations";
import { money } from "@/lib/money";

const occasions = [
  { id: "any", name: "Just because", note: "A thoughtful surprise", icon: Gift },
  { id: "housewarming", name: "A new home", note: "Make their space their own", icon: Home },
  { id: "thanks", name: "A little thank-you", note: "An everyday companion", icon: Heart },
  { id: "ritual", name: "A moment for them", note: "Something for slow rituals", icon: Sparkles },
];
export function GiftFinder({ products }: { products: ProductView[] }) {
  const [occasion, setOccasion] = useState("any");
  const [category, setCategory] = useState("");
  const [budget, setBudget] = useState("");
  const categories = useMemo(() => [...new Map(products.filter(p => p.category).map(p => [p.category!.slug, p.category!])).values()], [products]);
  const gifts = useMemo(() => findGifts(products, { occasion, category, budget: budget ? Number(budget) : null }), [products, occasion, category, budget]);
  function reset() { setOccasion("any"); setCategory(""); setBudget(""); }
  return <><section className="gift-picker" aria-label="Gift preferences"><fieldset><legend><span>01</span> What’s the occasion?</legend><div className="occasion-grid">{occasions.map(({ id, name, note, icon: Icon }) => <label className={`occasion-card ${occasion === id ? "selected" : ""}`} key={id}><input type="radio" name="occasion" value={id} checked={occasion === id} onChange={() => setOccasion(id)}/><Icon size={23}/><strong>{name}</strong><span>{note}</span></label>)}</div></fieldset><div className="gift-preferences"><label><span><b>02</b> What do they love?</span><select aria-label="Gift interest" className="filter-select" value={category} onChange={event => setCategory(event.target.value)}><option value="">A bit of everything</option>{categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}</select></label><label><span><b>03</b> Your budget per gift</span><select aria-label="Gift budget" className="filter-select" value={budget} onChange={event => setBudget(event.target.value)}><option value="">Open to inspiration</option>{[5000,10000,15000,25000,50000].map(amount => <option key={amount} value={amount}>Up to {money(amount)}</option>)}</select></label><button className="reset-filters" onClick={reset}>Start fresh</button></div></section><section className="gift-results" aria-label="Gift suggestions"><div className="section-head"><div><div className="eyebrow">A considered shortlist</div><h2>Something they’ll keep.</h2><p role="status" aria-live="polite">{gifts.length} available {gifts.length === 1 ? "idea" : "ideas"}{budget ? ` up to ${money(Number(budget))}` : " to explore"}. Prices are per object; delivery is calculated in your bag.</p></div><Link className="button-outline" href="/saved">Visit your saved edit <ArrowRight size={13}/></Link></div>{occasion !== "any" && <p className="gift-ranking-note">We show categories suited to your occasion first. Your chosen interest and budget determine which objects appear.</p>}{gifts.length ? <div className="product-grid">{gifts.map((product,index) => <ProductCard key={product.id} product={product} index={index}/>)}</div> : <div className="no-results"><Gift size={30}/><h2>A little more room for inspiration.</h2><p>No available gifts match this budget and interest. Try a wider selection.</p><button className="button-outline" onClick={reset}>Show all gift ideas</button></div>}</section></>;
}
