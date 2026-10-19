import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import "./globals.css";
import "./responsive.css";
import "./luxury.css";
import { MotionProvider } from "@/components/motion-provider";
import { DiscoveryProvider } from "@/components/discovery-provider";
import { WishlistProvider } from "@/components/wishlist-provider";
import { CartProvider } from "@/components/cart-provider";
import { StoreProvider } from "@/components/store-provider";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
export const metadata: Metadata = {
  title: "VELŌURA — Objects of quiet distinction",
  description: "Thoughtfully selected objects for a more considered everyday.",
};
export const dynamic = "force-dynamic";
export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings=await prisma.storeSettings.findUnique({where:{id:"main"},select:{storeName:true,tagline:true,announcement:true,supportEmail:true,shippingFee:true,freeShippingAt:true}}).catch(()=>null);
  return <html lang="en"><body><MotionProvider><StoreProvider initialSettings={settings??undefined}><CartProvider><WishlistProvider><DiscoveryProvider><a className="skip-link" href="#main-content">Skip to content</a><SiteHeader /><div id="main-content">{children}</div><SiteFooter /></DiscoveryProvider></WishlistProvider></CartProvider></StoreProvider></MotionProvider></body></html>;
}
