import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";
import { signingKey } from "@/lib/signing-key";

const COOKIE = "veloura_customer_session";
const fingerprint = (hash:string) => createHash("sha256").update(hash).digest("hex");
export const customerSelect = { id:true,email:true,name:true,phone:true,address:true,city:true,postalCode:true,createdAt:true } as const;
export async function setCustomerSession(customer:{id:string;passwordHash:string}) {
 const token=await new SignJWT({role:"customer",credentials:fingerprint(customer.passwordHash)}).setProtectedHeader({alg:"HS256"}).setSubject(customer.id).setIssuedAt().setExpirationTime("7d").sign(signingKey());
 (await cookies()).set(COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:7*86400});
}
export async function clearCustomerSession(){(await cookies()).set(COOKIE,"",{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:0})}
export async function getCustomerSession(){
 const token=(await cookies()).get(COOKIE)?.value;if(!token)return null;
 let identity;try{identity=(await jwtVerify(token,signingKey(),{algorithms:["HS256"]})).payload}catch{return null}
 if(identity.role!=="customer"||!identity.sub)return null;
 const customer=await prisma.customer.findUnique({where:{id:identity.sub}});
 return customer?.active&&identity.credentials===fingerprint(customer.passwordHash)?customer:null;
}
