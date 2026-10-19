"use client";
import { useHydrated } from "@/lib/use-hydrated";
import { createContext, startTransition, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { addCartItem, cleanCart, stockLimit, type CartItem } from "@/lib/cart";
export type { CartItem } from "@/lib/cart";
type CartContextValue={items:CartItem[];loaded:boolean;count:number;subtotal:number;addItem:(item:Omit<CartItem,"quantity">,quantity?:number)=>void;updateQuantity:(id:string,quantity:number)=>void;removeItem:(id:string)=>void;clearCart:()=>void};
const CartContext=createContext<CartContextValue|null>(null);
export function CartProvider({children}:{children:React.ReactNode}){
 const [items,setItems]=useState<CartItem[]>([]),[loaded,setLoaded]=useState(false);
 useEffect(()=>{let saved:CartItem[]=[];try{saved=cleanCart(JSON.parse(localStorage.getItem("veloura-cart")??"[]"))}catch{}startTransition(()=>{setItems(saved);setLoaded(true)})},[]);
 useEffect(()=>{if(loaded)try{localStorage.setItem("veloura-cart",JSON.stringify(items))}catch{}},[items,loaded]);
 const addItem=useCallback((product:Omit<CartItem,"quantity">,quantity=1)=>setItems(previous=>addCartItem(previous,product,quantity)),[]);
 const updateQuantity=useCallback((id:string,quantity:number)=>{if(!Number.isInteger(quantity))return;setItems(previous=>quantity<1?previous.filter(item=>item.id!==id):previous.map(item=>item.id===id?{...item,quantity:Math.min(stockLimit(item.stock),quantity)}:item).filter(item=>item.quantity>0))},[]);
 const removeItem=useCallback((id:string)=>setItems(previous=>previous.filter(item=>item.id!==id)),[]),clearCart=useCallback(()=>setItems([]),[]);
 const value=useMemo(()=>({items,loaded,count:items.reduce((sum,item)=>sum+item.quantity,0),subtotal:items.reduce((sum,item)=>sum+item.price*item.quantity,0),addItem,updateQuantity,removeItem,clearCart}),[items,loaded,addItem,updateQuantity,removeItem,clearCart]);
 return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
export function useCart(){const hydrated=useHydrated();const value=useContext(CartContext);if(!value)throw new Error("CartProvider is required");return hydrated?value:{...value,items:[],loaded:false,count:0,subtotal:0}}
