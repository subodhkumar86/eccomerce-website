import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { customerSchema, quoteOrder, CheckoutError } from "@/lib/checkout";
import { createReceiptToken } from "@/lib/order-receipt";
import { rejectCrossOrigin } from "@/lib/request-security";
export async function GET() {
 const auth=await requireAdmin();if(!auth.session)return auth.response!;
 try{const orders=await prisma.order.findMany({orderBy:{createdAt:"desc"}});return NextResponse.json({orders:orders.map(order=>({...order,items:JSON.parse(order.items)}))});}
 catch{return NextResponse.json({error:"Unable to load orders."},{status:503});}
}
export async function POST(req:Request) {
 const rejected=rejectCrossOrigin(req);if(rejected)return rejected;
 try{
  const body=customerSchema.parse(await req.json());
  const {idempotencyKey,expectedTotal,...details}=body;
  const fingerprint=createHash("sha256").update(JSON.stringify({...details,items:[...details.items].sort((a,b)=>a.productId.localeCompare(b.productId))})).digest("hex");
  const existing=idempotencyKey?await prisma.order.findUnique({where:{checkoutKey:idempotencyKey}}):null;
  if(existing){if(existing.checkoutFingerprint!==fingerprint)throw new CheckoutError("This checkout attempt has changed. Start a new checkout before placing it.");return NextResponse.json({ok:true,orderNumber:existing.orderNumber,receiptToken:await createReceiptToken(existing.id)});}
  // Generate the receipt before committing so a missing signing key cannot create an unconfirmed order.
  const id=randomUUID();const receiptToken=await createReceiptToken(id);
  const order=await prisma.$transaction(async tx=>{
   const quote=await quoteOrder(body.items,tx);
   if(expectedTotal!==undefined&&expectedTotal!==quote.total)throw new CheckoutError("The price or delivery charge changed. Review the updated total before placing your order.");
   for(const item of quote.items){const updated=await tx.product.updateMany({where:{id:item.productId,active:true,price:item.price,stock:{gte:item.quantity}},data:{stock:{decrement:item.quantity}}});if(updated.count!==1)throw new CheckoutError("Your selection changed. Review your bag and try again.");}
   return tx.order.create({data:{id,orderNumber:`VL-${randomUUID().replaceAll("-","").slice(0,16).toUpperCase()}`,checkoutKey:idempotencyKey,checkoutFingerprint:fingerprint,customerName:body.customerName,email:body.email,phone:body.phone,address:body.address,city:body.city,postalCode:body.postalCode,notes:body.notes||null,items:JSON.stringify(quote.items),subtotal:quote.subtotal,shipping:quote.shipping,total:quote.total,paymentMethod:"COD",paymentStatus:"PENDING",status:"NEW"}});
  });
  return NextResponse.json({ok:true,orderNumber:order.orderNumber,receiptToken},{status:201});
 }catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return NextResponse.json({error:"This checkout is already being processed. Retry with the same checkout details."},{status:409});
  return NextResponse.json({error:error instanceof CheckoutError?error.message:error instanceof z.ZodError||error instanceof SyntaxError?"Please check your delivery details and bag items.":"Unable to place your order right now. Please try again."},{status:error instanceof CheckoutError?409:error instanceof z.ZodError||error instanceof SyntaxError?400:503});
 }
}
