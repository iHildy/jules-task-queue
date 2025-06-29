import { env } from "@/lib/env";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    errorFormat: "pretty",
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;

// Graceful shutdown
process.on("beforeExit", async () => {
  await db.$disconnect();
});
