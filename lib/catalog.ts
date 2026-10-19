import { prisma } from "@/lib/prisma";
export async function getCatalogProducts(){return prisma.product.findMany({where:{active:true},include:{category:true},orderBy:{createdAt:"desc"}})}
