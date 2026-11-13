import { PrismaClient } from "@prisma/client";

// Singleton agar hot-reload `next dev` tidak membuat koneksi baru setiap kali modul dimuat ulang.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
