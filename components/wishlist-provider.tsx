"use client";
import { useHydrated } from "@/lib/use-hydrated";
import { createContext, startTransition, useContext, useEffect, useState } from "react";
const Context = createContext<{ids:string[];loaded:boolean;toggle:(id:string)=>void;save:(id:string)=>void;remove:(id:string)=>void}>({ids:[],loaded:false,toggle:()=>{},save:()=>{},remove:()=>{}});
export function WishlistProvider({children}:{children:React.ReactNode}) {
  const [ids,setIds]=useState<string[]>([]);
  const [loaded,setLoaded]=useState(false);
  useEffect(()=>{startTransition(()=>{try{const saved:unknown=JSON.parse(localStorage.getItem("veloura-wishlist")??"[]");if(Array.isArray(saved))setIds([...new Set(saved.filter((id):id is string=>typeof id==="string"))].slice(0,500));}catch{}setLoaded(true)})},[]);
  useEffect(()=>{if(loaded)try{localStorage.setItem("veloura-wishlist",JSON.stringify(ids))}catch{}},[ids,loaded]);
  return <Context.Provider value={{ids,loaded,save:(id)=>setIds(prev=>prev.includes(id)?prev:[...prev,id]),remove:(id)=>setIds(prev=>prev.filter(value=>value!==id)),toggle:(id)=>setIds(prev=>prev.includes(id)?prev.filter(v=>v!==id):[...prev,id])}}>{children}</Context.Provider>;
}
export function useWishlist(){const hydrated=useHydrated();const value=useContext(Context);return hydrated?value:{...value,ids:[],loaded:false}}
