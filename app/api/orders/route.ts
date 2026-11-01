import { getCustomerSession } from "@/lib/customer-auth";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { customerSchema, quoteOrder, CheckoutError } from "@/lib/checkout";
import { createReceiptToken } from "@/lib/order-receipt";
import { rejectCrossOrigin } from "@/lib/request-security";
import { onlinePaymentsAvailable } from "@/lib/payments";
import { paymentAmount } from "@/lib/payment-security";
import { upiAvailable } from "@/lib/upi";
export async function GET() {
 const auth=await requireAdmin();if(!auth.session)return auth.response!;
 try{const orders=await prisma.order.findMany({orderBy:{createdAt:"desc"}});const paymentIds=orders.filter(o=>o.paymentMethod!=="COD").map(o=>o.id);const intents=paymentIds.length?await prisma.paymentIntent.findMany({where:{id:{in:paymentIds}},select:{id:true,providerOrderId:true,paymentId:true,method:true,upiReference:true,upiSubmittedAt:true,payeeVpa:true,payeeName:true}}):[];const payments=new Map(intents.map(p=>[p.id,p]));return NextResponse.json({orders:orders.map(order=>({...order,items:JSON.parse(order.items),paymentDetails:payments.get(order.id)??null}))});}
 catch{return NextResponse.json({error:"Unable to load orders."},{status:503});}
}
export async function POST(req:Request) {
 const rejected=rejectCrossOrigin(req);if(rejected)return rejected;
 try{
  const body=customerSchema.parse(await req.json());
  const customer=await getCustomerSession();
  if(customer)body.email=customer.email;
  const {idempotencyKey,expectedTotal,paymentMethod,...details}=body;
  const fingerprint=createHash("sha256").update(JSON.stringify({...details,...(paymentMethod==="COD"?{}:{paymentMethod}),customerId:customer?.id??null,items:[...details.items].sort((a,b)=>a.productId.localeCompare(b.productId))})).digest("hex");
  const existing=idempotencyKey?await prisma.order.findUnique({where:{checkoutKey:idempotencyKey}}):null;
  if(existing){if(existing.checkoutFingerprint!==fingerprint)throw new CheckoutError("This checkout attempt has changed. Start a new checkout before placing it.");return NextResponse.json({ok:true,orderNumber:existing.orderNumber,receiptToken:await createReceiptToken(existing.id)});}
  if(paymentMethod==="RAZORPAY"&&!await onlinePaymentsAvailable())throw new CheckoutError("Online payment is unavailable. Choose another payment method.");
  if(paymentMethod==="UPI"&&!upiAvailable())throw new CheckoutError("UPI is unavailable. Choose another payment method.");
  // Generate the receipt before committing so a missing signing key cannot create an unconfirmed order.
  const id=randomUUID();const receiptToken=await createReceiptToken(id);
  const order=await prisma.$transaction(async tx=>{
   const quote=await quoteOrder(body.items,tx);
   if(paymentMethod!=="COD"){try{paymentAmount(quote.total)}catch{throw new CheckoutError("This total is not supported for online payment. Choose cash on delivery or contact the store.");}}
   if(expectedTotal!==undefined&&expectedTotal!==quote.total)throw new CheckoutError("The price or delivery charge changed. Review the updated total before placing your order.");
   for(const item of quote.items){const updated=await tx.product.updateMany({where:{id:item.productId,active:true,price:item.price,stock:{gte:item.quantity}},data:{stock:{decrement:item.quantity}}});if(updated.count!==1)throw new CheckoutError("Your selection changed. Review your bag and try again.");}
   const created=await tx.order.create({data:{id,orderNumber:`VL-${randomUUID().replaceAll("-","").slice(0,16).toUpperCase()}`,checkoutKey:idempotencyKey,checkoutFingerprint:fingerprint,customerId:customer?.id??null,customerName:body.customerName,email:body.email,phone:body.phone,address:body.address,city:body.city,postalCode:body.postalCode,notes:body.notes||null,items:JSON.stringify(quote.items),subtotal:quote.subtotal,shipping:quote.shipping,total:quote.total,paymentMethod,paymentStatus:"PENDING",status:"NEW"}});
   if(paymentMethod!=="COD"){
    const settings=await tx.storeSettings.findUnique({where:{id:"main"},select:{storeName:true}});
    await tx.paymentIntent.create({data:{id,providerOrderId:null,leaseUntil:new Date(0),method:paymentMethod==="RAZORPAY"?(process.env.RAZORPAY_KEY_ID?.startsWith("rzp_test_")?"test:pending":"pending"):null,payeeVpa:paymentMethod==="UPI"?process.env.UPI_ID:null,payeeName:paymentMethod==="UPI"?(process.env.UPI_PAYEE_NAME?.trim()||settings?.storeName||"Store"):null}});
   }
   return created;
  });
  return NextResponse.json({ok:true,orderNumber:order.orderNumber,receiptToken},{status:201});
 }catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==="P2002")return NextResponse.json({error:"This checkout is already being processed. Retry with the same checkout details."},{status:409});
  return NextResponse.json({error:error instanceof CheckoutError?error.message:error instanceof z.ZodError||error instanceof SyntaxError?"Please check your delivery details and bag items.":"Unable to place your order right now. Please try again."},{status:error instanceof CheckoutError?409:error instanceof z.ZodError||error instanceof SyntaxError?400:503});
 }
}
