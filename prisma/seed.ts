import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { createDatabaseClient } from "../scripts/database.cjs";
const prisma = createDatabaseClient() as PrismaClient;
const photos = {
  bag: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?auto=format&fit=crop&w=1000&q=85",
  chair: "https://images.unsplash.com/photo-1503602642458-232111445657?auto=format&fit=crop&w=1000&q=85",
  perfume: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=1000&q=85",
  lamp: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=1000&q=85",
  watch: "https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=1000&q=85",
  vase: "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=1000&q=85",
  sneakers: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1000&q=85",
  glasses: "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=1000&q=85"
};
async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@veloura.com").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeThisNow!2026";
  await prisma.admin.upsert({ where: { email }, update: {}, create: { email, name: "Store Admin", passwordHash: await bcrypt.hash(password, 12) } });
  const cats = ["Accessories", "Home objects", "Fragrance", "Timepieces", "Style", "Stationery", "Textiles"];
  const categoryMap: Record<string, string> = {};
  for (const name of cats) {
    const c = await prisma.category.upsert({ where: { slug: name.toLowerCase().replaceAll(" ", "-") }, update: {}, create: { name, slug: name.toLowerCase().replaceAll(" ", "-") } });
    categoryMap[name] = c.id;
  }
  const products = [
    { name: "The Sculpted Carryall", slug: "sculpted-carryall", description: "A quietly confident everyday silhouette, finished with considered details and a generous interior.", price: 12900, compareAtPrice: 15900, image: photos.bag, category: "Accessories", stock: 18, featured: true },
    { name: "Forma Lounge Chair", slug: "forma-lounge-chair", description: "An architectural accent for slow mornings, crafted to bring softness and structure into a room.", price: 28900, image: photos.chair, category: "Home objects", stock: 7, featured: true },
    { name: "No. 08 Eau de Parfum", slug: "no-08-eau-de-parfum", description: "Warm woods, citrus peel and a soft amber finish. An intimate scent made to linger.", price: 7600, image: photos.perfume, category: "Fragrance", stock: 26, featured: true },
    { name: "Halo Table Light", slug: "halo-table-light", description: "Sculptural ambient lighting in a refined form, designed to make the everyday feel ceremonial.", price: 11400, image: photos.lamp, category: "Home objects", stock: 12, featured: true },
    { name: "Atelier Automatic", slug: "atelier-automatic", description: "A pared-back timepiece with a beautifully balanced dial and enduring proportions.", price: 22900, image: photos.watch, category: "Timepieces", stock: 9, featured: false },
    { name: "Pebble Ceramic Vessel", slug: "pebble-ceramic-vessel", description: "A tactile, hand-finished vessel that feels at home with a single stem or on its own.", price: 4200, image: photos.vase, category: "Home objects", stock: 32, featured: false },
    { name: "Studio Runner 01", slug: "studio-runner-01", description: "A modern everyday runner with clean lines, soft support and an understated profile.", price: 8900, image: photos.sneakers, category: "Style", stock: 21, featured: false },
    { name: "Archive Optical No. 2", slug: "archive-optical-no-2", description: "Timeless optical frames with a lightweight feel and a confident, considered finish.", price: 6400, image: photos.glasses, category: "Accessories", stock: 15, featured: false },
    { name: "Morning Notes Journal", slug: "morning-notes-journal", description: "A notebook for daily lists, observations and ideas worth returning to. Keep it close to your morning coffee or slip it into your everyday bag. Contact the studio for paper and sizing details.", price: 950, image: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=1000&q=85", category: "Stationery", stock: 30, featured: false },
    { name: "The Reading Corner Throw", slug: "reading-corner-throw", description: "A soft accent for a reading chair or the end of a sofa. A simple way to introduce texture into a quiet corner. Check the supplied care label before cleaning; ask the studio about composition and dimensions.", price: 3200, image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1000&q=85", category: "Textiles", stock: 14, featured: false },
    { name: "Sunday Coffee Cup", slug: "sunday-coffee-cup", description: "An everyday cup with an uncomplicated silhouette, ready for a slower start. Pair it with your favourite reading spot. Confirm capacity and food-contact care instructions with the studio before ordering.", price: 1200, image: "https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?auto=format&fit=crop&w=1000&q=85", category: "Home objects", stock: 24, featured: false },
    { name: "Still Life Desk Lamp", slug: "still-life-desk-lamp", description: "A focused accent for a desk, side table or evening reading corner. Its compact visual presence works alongside books and everyday objects. Ask the studio about electrical specifications, bulb compatibility and dimensions.", price: 5800, image: photos.lamp, category: "Home objects", stock: 10, featured: false },
    { name: "Pocket Companion", slug: "pocket-companion", description: "A small carry companion for the essentials you want close at hand. A considered addition to a lighter everyday routine. Contact the studio for material, dimensions and compartment details.", price: 2400, image: photos.bag, category: "Accessories", stock: 18, featured: false },
    { name: "Amber Evening No. 12", slug: "amber-evening-no-12", description: "An evening-inspired fragrance concept with a warm, understated character. Fragrance is personal: contact the studio for the note profile, ingredients, volume and suitability before choosing.", price: 4600, image: photos.perfume, category: "Fragrance", stock: 12, featured: false },
    { name: "Contour Accent Vessel", slug: "contour-accent-vessel", description: "A decorative vessel for a shelf, console or quiet tabletop arrangement. Display it on its own for a simple sculptural accent. Do not assume it is watertight or food-safe; confirm the supplied instructions.", price: 2800, image: photos.vase, category: "Home objects", stock: 16, featured: false },
    { name: "Everyday Dial", slug: "everyday-dial", description: "A restrained timepiece design for an everyday edit. Compare its shape with the accessories you already wear. Ask the studio about movement, case dimensions, strap sizing and water resistance before ordering.", price: 9800, image: photos.watch, category: "Timepieces", stock: 8, featured: false }
  ];
  for (const p of products) {
    const { category, ...data } = p;
    await prisma.product.upsert({ where: { slug: p.slug }, update: {}, create: { ...data, categoryId: categoryMap[category] } });
  }
  await prisma.storeSettings.upsert({ where: { id: "main" }, update: {}, create: { id: "main" } });
}
main().catch(error => { console.error("Database seeding failed:", error instanceof Error ? error.message : "Unknown error"); process.exitCode = 1; }).finally(() => prisma.$disconnect());
