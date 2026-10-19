import Link from "next/link";
import { Check } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { readReceiptToken } from "@/lib/order-receipt";
import { money } from "@/lib/money";
export const dynamic="force-dynamic";
export const metadata={title:"Your order | Veloura",robots:{index:false,follow:false},referrer:"no-referrer" as const};
export default async function OrderSuccess({searchParams}:{searchParams:Promise<{token?:string}>}){
 const {token}=await searchParams;const id=token?await readReceiptToken(token):null;
 const order=id?await prisma.order.findUnique({where:{id}}):null;
 if(!order)return <main className="page-container"><div className="empty-state"><h1>We couldn’t open that confirmation.</h1><p>Use the confirmation link from your checkout. Links expire after seven days.</p><Link className="button-dark" href="/delivery">Contact & delivery information</Link></div></main>;
 const items=JSON.parse(order.items) as {name:string;quantity:number;price:number}[];
 return <main className="page-container"><div className="success-order"><div className="success-mark"><Check size={28}/></div><div className="eyebrow">A good choice</div><h1>Order received.</h1><p>Your order is safely recorded. Save this page to revisit its status for the next seven days.</p><p>ORDER REFERENCE · <strong>{order.orderNumber}</strong></p><p><span className="status-pill">{order.status}</span></p><div className="receipt-items">{items.map((item,index)=><div className="summary-line" key={index}><span>{item.name} × {item.quantity}</span><span>{money(item.price*item.quantity)}</span></div>)}<div className="summary-line"><span>Delivery</span><span>{money(order.shipping)}</span></div><div className="summary-line summary-total"><span>Total · cash on delivery</span><strong>{money(order.total)}</strong></div></div><Link href="/products" className="button-dark">Continue exploring</Link></div></main>;
}
