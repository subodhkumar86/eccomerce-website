import type { PrismaClient } from "@prisma/client";
import { createDatabaseClient } from "@/scripts/database.cjs";
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? createDatabaseClient() as PrismaClient;
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
