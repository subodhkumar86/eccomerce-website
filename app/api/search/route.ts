import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const querySchema = z.string().trim().max(100);

export async function GET(req: Request) {
  const parsed = querySchema.safeParse(new URL(req.url).searchParams.get("q") ?? "");
  if (!parsed.success) return NextResponse.json({ error: "Keep your search within 100 characters." }, { status: 400 });
  const q = parsed.data;
  if (q.length < 2) return NextResponse.json({ products: [], hasMore: false });
  try {
    const contains = { contains: q, ...(process.env.DATABASE_URL?.startsWith("mongodb") ? { mode: "insensitive" as const } : {}) };
    const products = await prisma.product.findMany({
      where: { active: true, OR: [{ name: contains }, { description: contains }, { category: { name: contains } }] },
      select: { id: true, name: true, slug: true, image: true, price: true, stock: true, category: { select: { name: true } } },
      orderBy: [{ featured: "desc" }, { name: "asc" }, { id: "asc" }], take: 9,
    });
    return NextResponse.json({ products: products.slice(0, 8), hasMore: products.length > 8 }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ error: "Search is temporarily unavailable. Please try again." }, { status: 503 }); }
}
