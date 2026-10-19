import type { MetadataRoute } from "next";
import { journal } from "@/lib/journal";
import { publicUrl } from "@/lib/public-url";
import { getCatalogProducts } from "@/lib/catalog";
export const dynamic="force-dynamic";
export default async function sitemap():Promise<MetadataRoute.Sitemap>{const origin=publicUrl();if(!origin)return [];const products=await getCatalogProducts();return [...["/","/products","/gifts","/collections","/personal-shopping","/new-arrivals","/journal","/about","/contact","/faq","/care","/delivery","/privacy"].map(path=>({url:origin+path})),...journal.map(story=>({url:`${origin}/journal/${story.slug}`})),...products.map(product=>({url:`${origin}/products/${encodeURIComponent(product.slug)}`,lastModified:product.updatedAt}))]}
