import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { customerSelect,getCustomerSession,setCustomerSession } from "@/lib/customer-auth";
import { rejectCrossOrigin,rateLimit } from "@/lib/request-security";
export async function GET(){try{const user=await getCustomerSession();if(!user)return NextResponse.json({customer:null});return NextResponse.json({customer:await prisma.customer.findUnique({where:{id:user.id},select:customerSelect})})}catch{return NextResponse.json({error:"Unable to load your account."},{status:503})}}
const schema=z.object({name:z.string().trim().min(2).max(100),phone:z.string().trim().max(30),address:z.string().trim().max(250),city:z.string().trim().max(100),postalCode:z.string().trim().max(15),currentPassword:z.string().max(72).optional(),newPassword:z.string().min(10).max(72).optional()});
export async function PUT(req:Request){const rejected=rejectCrossOrigin(req);if(rejected)return rejected;try{
 const user=await getCustomerSession();if(!user)return NextResponse.json({error:"Please sign in."},{status:401});const data=schema.parse(await req.json());
 const {currentPassword,newPassword,...profile}=data;let passwordHash;
 if(newPassword){if(!rateLimit(`customer-password:${user.id}`,10,15*60000))return NextResponse.json({error:"Try again in 15 minutes."},{status:429});if(Buffer.byteLength(newPassword)>72||!currentPassword||!await bcrypt.compare(currentPassword,user.passwordHash))return NextResponse.json({error:"Check your current password and use a new password of 10–72 bytes."},{status:400});passwordHash=await bcrypt.hash(newPassword,12)}
 const updated=await prisma.customer.update({where:{id:user.id},data:{...profile,...(passwordHash?{passwordHash}:{})}});if(passwordHash)await setCustomerSession(updated);return NextResponse.json({ok:true});
 }catch(e){return NextResponse.json({error:e instanceof z.ZodError?"Please check your profile details.":"Unable to save your profile."},{status:e instanceof z.ZodError?400:503})}}
