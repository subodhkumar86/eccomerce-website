import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { orderStatuses, paymentStatuses, orderTransitionError } from "@/lib/order-workflow";
const schema=z.object({status:z.enum(orderStatuses).optional(),paymentStatus:z.enum(paymentStatuses).optional()}).refine(body=>Boolean(body.status||body.paymentStatus));
class Conflict extends Error {}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}) {
 const auth=await requireAdmin();if(!auth.session)return auth.response!;
 try {
  const {id}=await params,changes=schema.parse(await req.json());
  await prisma.$transaction(async tx=>{
   const previous=await tx.order.findUnique({where:{id}});
   if(!previous)throw new Conflict("Order not found.");
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
