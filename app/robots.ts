import type { MetadataRoute } from "next";
import { publicUrl } from "@/lib/public-url";
export const dynamic="force-dynamic";
export default function robots():MetadataRoute.Robots{const origin=publicUrl();return {rules:[{userAgent:"*",allow:"/",disallow:["/admin","/api/","/checkout","/cart","/saved","/order-success"]}],...(origin?{sitemap:`${origin}/sitemap.xml`}:{})}}
