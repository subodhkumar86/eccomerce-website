import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerSelect } from "@/lib/customer-auth";
export async function GET(){const auth=await requireAdmin();if(!auth.session)return auth.response!;try{const customers=await prisma.customer.findMany({select:{...customerSelect,active:true},orderBy:{createdAt:"desc"},take:1000});const orders=await prisma.order.findMany({where:{customerId:{not:null}},select:{customerId:true,total:true,status:true}});return NextResponse.json({customers:customers.map(c=>{const history=orders.filter(o=>o.customerId===c.id);return {...c,orders:history.length,value:history.filter(o=>o.status!=="CANCELLED").reduce((sum,o)=>sum+o.total,0)}})})}catch{return NextResponse.json({error:"Unable to load registered customers."},{status:503})}}
export async function PATCH(req:Request){const auth=await requireAdmin();if(!auth.session)return auth.response!;try{const data=z.object({id:z.string().min(1),active:z.boolean()}).parse(await req.json());await prisma.customer.update({where:{id:data.id},data:{active:data.active}});return NextResponse.json({ok:true})}catch{return NextResponse.json({error:"Unable to update this customer account."},{status:400})}}
