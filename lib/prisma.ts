import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const unavailablePrisma = new Proxy(
  {},
  {
    get() {
      throw new Error("Prisma client is unavailable because DATABASE_URL is not configured.");
    },
  },
) as PrismaClient;

export const prisma =
  globalForPrisma.prisma ??
  (process.env.DATABASE_URL
    ? new PrismaClient({
        adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
        log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
      })
    : unavailablePrisma);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export const getPrismaOrThrow = () => {
  return prisma;
};
