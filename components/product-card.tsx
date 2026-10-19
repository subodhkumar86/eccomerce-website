"use client";
import { StoreImage } from "@/components/store-image";

import Link from "next/link";import { useState } from "react";import { motion } from "framer-motion";import { Check, Heart, Eye } from "lucide-react";import { useCart } from "@/components/cart-provider";import { money } from "@/lib/money";
import { useSiteMotion } from "@/components/motion-provider";
import { useDiscovery } from "@/components/discovery-provider";
import { useWishlist } from "@/components/wishlist-provider";
export type ProductView={id:string;name:string;slug:string;description:string;price:number;compareAtPrice:number|null;image:string;stock:number;restockedAt?:string|Date|null;featured:boolean;active:boolean;category:{id:string;name:string;slug:string}|null};
export function ProductCard({product,index=0}:{product:ProductView;index?:number}){
 const {enabled}=useSiteMotion();
 const {compared,toggleCompare,preview}=useDiscovery();const selected=compared.some(p=>p.id===product.id);
 const {ids,toggle}=useWishlist();const saved=ids.includes(product.id);const {addItem,items,loaded}=useCart();const bagFull=items.length>=30&&!items.some(item=>item.id===product.id);const atLimit=(items.find(item=>item.id===product.id)?.quantity??0)>=Math.min(99,product.stock);const [added,setAdded]=useState(false);
 function add(e:React.MouseEvent){e.preventDefault();e.stopPropagation();if(!loaded||atLimit||bagFull)return;addItem({id:product.id,slug:product.slug,name:product.name,price:product.price,image:product.image,stock:product.stock});setAdded(true);setTimeout(()=>setAdded(false),1400)}
 return <motion.article className="product-card" initial={false} animate={!enabled?{opacity:1,y:0}:undefined} whileHover={enabled?{y:-5}:undefined} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:.12}} transition={{duration:.4,delay:(index%4)*.035}}>
  <div className="product-image-wrap"><button className={`save-product ${saved?"is-saved":""}`} aria-label={`${saved?"Remove":"Save"} ${product.name}${saved?" from":" to"} favourites`} aria-pressed={saved} onClick={()=>toggle(product.id)}><Heart size={17} fill={saved?"currentColor":"none"}/></button><Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`} style={{display:"block",width:"100%",height:"100%"}}><StoreImage className="product-image" src={product.image} alt={product.name} loading="lazy"/>{product.compareAtPrice&&product.compareAtPrice>product.price?<span className="product-badge">Considered price</span>:product.featured?<span className="product-badge">Studio selection</span>:null}</Link><button className="quick-add" onClick={add} disabled={!loaded||product.stock<=0||atLimit||bagFull}>{product.stock<=0?"Out of stock":bagFull?"Bag limit reached":atLimit?"Available quantity in your bag":added?<><Check size={12} style={{display:"inline",verticalAlign:"middle",marginRight:6}}/>Added to bag</>:"Add to bag +"}</button></div>
  <Link href={`/products/${product.slug}`}><div className="product-info"><div className="product-category">{product.category?.name??"The collection"}</div><div className="product-name-row"><div className="product-name">{product.name}</div><div className="product-price">{money(product.price)}{product.compareAtPrice&&product.compareAtPrice>product.price?<span className="old-price">{money(product.compareAtPrice)}</span>:null}</div></div></div></Link>
 <div className="product-card-tools"><button className="preview-trigger" aria-label={`Quick view ${product.name}`} onClick={()=>preview(product)}><Eye size={13}/> Quick view</button><button className={`compare-toggle ${selected?"selected":""}`} aria-pressed={selected} disabled={!selected&&compared.length>=3} onClick={()=>toggleCompare(product)}>{selected?"Selected for comparison":"+ Compare object"}</button>
 </div></motion.article>
}
