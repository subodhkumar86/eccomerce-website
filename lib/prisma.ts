import type { PrismaClient } from "@prisma/client";
import { createDatabaseClient } from "@/scripts/database.cjs";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; databaseUrl?: string };
export const prisma = (globalForPrisma.databaseUrl===process.env.DATABASE_URL?globalForPrisma.prisma:undefined) ?? createDatabaseClient() as PrismaClient;
if (process.env.NODE_ENV !== "production") {globalForPrisma.prisma = prisma;globalForPrisma.databaseUrl=process.env.DATABASE_URL;}
