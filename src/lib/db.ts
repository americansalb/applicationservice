import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { sslConfigForUrl, externalizeRenderHost } from "./dbSsl";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  const connectionString = externalizeRenderHost(raw);
  const ssl = sslConfigForUrl(connectionString);
  const pool = new pg.Pool({
    connectionString,
    ssl,
    // Let DNS resolve IPv4 or IPv6 — Render's internal hostnames are IPv6-only
    // (AAAA), so forcing IPv4 here breaks with getaddrinfo ENOTFOUND.
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    query_timeout: 15_000,
    statement_timeout: 15_000,
    idleTimeoutMillis: 30_000,
  });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
