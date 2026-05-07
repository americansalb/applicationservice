import { Pool } from "pg";

export * from "./partnersSchema";

let pool: Pool | null = null;

export function getPartnersPool() {
  if (!pool) {
    const connectionString = process.env.PARTNERS_DATABASE_URL;
    if (!connectionString) {
      throw new Error("PARTNERS_DATABASE_URL is not set");
    }
    const ssl = connectionString.includes("sslmode=")
      ? { rejectUnauthorized: false }
      : false;
    const p = new Pool({
      connectionString,
      ssl,
      connectionTimeoutMillis: 10_000,
      query_timeout: 30_000,
      statement_timeout: 30_000,
      idleTimeoutMillis: 30_000,
    });
    p.on("error", (err: Error) => {
      console.error("[partners-pg] idle client error, resetting pool:", err.message);
      if (pool === p) pool = null;
      p.end().catch(() => {});
    });
    pool = p;
  }
  return pool;
}

export function resetPartnersPool() {
  const p = pool;
  pool = null;
  if (p) p.end().catch(() => {});
}
