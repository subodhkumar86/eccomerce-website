import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { orderStatuses, paymentStatuses, orderTransitionError } from "@/lib/order-workflow";
const schema=z.object({status:z.enum(orderStatuses).optional(),paymentStatus:z.enum(paymentStatuses).optional(),paymentVerified:z.boolean().optional(),paymentReference:z.string().trim().regex(/^[A-Za-z0-9 -]{6,80}$/).optional()}).refine(body=>Boolean(body.status||body.paymentStatus));
class Conflict extends Error {}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}) {
 const auth=await requireAdmin();if(!auth.session)return auth.response!;
 try {
  const {id}=await params,{paymentVerified,paymentReference,...changes}=schema.parse(await req.json());
  await prisma.$transaction(async tx=>{
   const previous=await tx.order.findUnique({where:{id}});
   if(!previous)throw new Conflict("Order not found.");
   if(previous.paymentMethod==="RAZORPAY"&&changes.paymentStatus&&changes.paymentStatus!==previous.paymentStatus)throw new Conflict("Razorpay payment/refund status must be verified with the provider. Use the Razorpay dashboard for refunds.");
   if(previous.paymentMethod==="RAZORPAY"&&changes.status&&!["NEW","CANCELLED"].includes(changes.status)){
    const intent=await tx.paymentIntent.findUnique({where:{id}});
    if(intent?.method?.startsWith("test:"))throw new Conflict("Test-mode gateway orders do not collect real money and cannot be fulfilled. Cancel the test order before going live.");
   }
   if(previous.paymentMethod==="UPI"&&changes.paymentStatus==="PAID"&&previous.paymentStatus!=="PAID"){
    const intent=await tx.paymentIntent.findUnique({where:{id}});
    const verifiedReference=paymentReference||intent?.upiReference;
    if(!paymentVerified||!intent||!verifiedReference)throw new Conflict("Verify a UPI reference against an actual bank credit before marking paid.");
    await tx.paymentIntent.update({where:{id},data:{upiReference:verifiedReference,method:"upi_bank_verified"}});
   }
   if(previous.paymentMethod!=="COD"&&previous.paymentStatus!=="PAID"&&changes.paymentStatus!=="PAID"&&changes.status&&!["NEW","CANCELLED"].includes(changes.status))throw new Conflict("Verify online payment before confirming or fulfilling this order.");
   const invalid=orderTransitionError(previous.status,changes.status);if(invalid)throw new Conflict(invalid);
   if(changes.paymentStatus==="REFUNDED"&&!["PAID","REFUNDED"].includes(previous.paymentStatus))throw new Conflict("Only a paid order can be marked refunded.");
   if(previous.paymentStatus==="REFUNDED"&&changes.paymentStatus&&changes.paymentStatus!=="REFUNDED")throw new Conflict("A refunded payment cannot be reopened.");
   const updated=await tx.order.updateMany({where:{id,status:previous.status,paymentStatus:previous.paymentStatus},data:changes});
   if(updated.count!==1)throw new Conflict("This order changed. Refresh and try again.");
   if(changes.status==="CANCELLED"&&previous.status!=="CANCELLED"){
    const items=z.array(z.object({productId:z.string(),quantity:z.number().int().positive()})).parse(JSON.parse(previous.items));
    for(const item of items)await tx.product.updateMany({where:{id:item.productId},data:{stock:{increment:item.quantity}}});
   }
  });
  return NextResponse.json({ok:true});
 } catch(error){return NextResponse.json({error:error instanceof Conflict?error.message:error instanceof z.ZodError?"Invalid order or payment data.":"Could not update this order. Refresh and retry."},{status:error instanceof Conflict?409:400});}
}
