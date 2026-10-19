import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
export async function GET(){const auth=await requireAdmin();if(!auth.session)return auth.response!;try{return NextResponse.json({subscribers:await prisma.subscriber.findMany({orderBy:{createdAt:"desc"}})});}catch{return NextResponse.json({error:"Could not load subscribers."},{status:503});}}
export async function DELETE(req:Request){const auth=await requireAdmin();if(!auth.session)return auth.response!;try{const {id}=z.object({id:z.string().min(1)}).parse(await req.json());await prisma.subscriber.delete({where:{id}});return NextResponse.json({ok:true});}catch{return NextResponse.json({error:"Could not remove this subscriber."},{status:400});}}
