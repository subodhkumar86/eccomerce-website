import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic="force-dynamic";
export async function GET(){try{const settings=await prisma.storeSettings.findUnique({where:{id:"main"},select:{id:true}});if(!settings)throw new Error("Initialisation pending");return NextResponse.json({status:"ok"},{headers:{"Cache-Control":"no-store"}})}catch{return NextResponse.json({status:"unavailable"},{status:503,headers:{"Cache-Control":"no-store"}})}}
