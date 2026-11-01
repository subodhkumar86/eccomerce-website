import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { setCustomerSession, clearCustomerSession } from "@/lib/customer-auth";
import { rateLimit, rejectCrossOrigin } from "@/lib/request-security";
const schema=z.object({action:z.enum(["login","signup"]),email:z.string().trim().email().max(200).transform(v=>v.toLowerCase()),password:z.string().min(1).max(72),name:z.string().trim().max(100).optional()});
export async function POST(req:Request){
 const rejected=rejectCrossOrigin(req);if(rejected)return rejected;
 try{const data=schema.parse(await req.json());
 if(!rateLimit(`customer:${data.email}`,15,15*60*1000))return NextResponse.json({error:"Too many attempts. Try again in 15 minutes."},{status:429});
 let customer=await prisma.customer.findUnique({where:{email:data.email}});
 if(data.action==="signup"){
  if(!data.name||data.name.length<2||data.password.length<10||Buffer.byteLength(data.password)>72)return NextResponse.json({error:"Enter your name and a password of 10–72 bytes."},{status:400});
  if(customer)return NextResponse.json({error:"Unable to create this account. Try signing in instead."},{status:409});
  customer=await prisma.customer.create({data:{email:data.email,name:data.name,passwordHash:await bcrypt.hash(data.password,12)}});
 }else{
  const hash=customer?.passwordHash??"$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxZyyp0DBBX2LmNhkJd28h8KFiW";
  const valid=await bcrypt.compare(data.password,hash);
  if(!customer?.active||!valid)return NextResponse.json({error:"The email or password is incorrect."},{status:401});
 }
 await setCustomerSession(customer!);return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e instanceof z.ZodError?"Check your name, email and password.":"Account access is unavailable. Please try again."},{status:e instanceof z.ZodError?400:503})}
}
export async function DELETE(req:Request){const rejected=rejectCrossOrigin(req);if(rejected)return rejected;await clearCustomerSession();return NextResponse.json({ok:true})}
