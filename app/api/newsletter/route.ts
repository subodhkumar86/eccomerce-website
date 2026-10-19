import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { rejectCrossOrigin, rateLimit } from "@/lib/request-security";
const schema=z.object({email:z.string().trim().email().max(200).transform(value=>value.toLowerCase()),consent:z.literal(true)});
export async function POST(req:Request) {
  const rejected=rejectCrossOrigin(req);if(rejected)return rejected;
  try {const body=schema.parse(await req.json());if(!rateLimit(`newsletter:${body.email}`,5,60*60*1000))return NextResponse.json({error:"Please try again later."},{status:429});await prisma.subscriber.upsert({where:{email:body.email},update:{},create:{email:body.email}});return NextResponse.json({ok:true});}
  catch(error){return NextResponse.json({error:error instanceof z.ZodError||error instanceof SyntaxError?"Enter a valid email and agree to receive updates.":"Subscriptions are temporarily unavailable. Please try again."},{status:error instanceof z.ZodError||error instanceof SyntaxError?400:503});}
}
