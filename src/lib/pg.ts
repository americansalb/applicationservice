import { Pool } from "pg";

let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL not set");
    }
    const ssl = connectionString.includes("sslmode=")
      ? { rejectUnauthorized: false }
      : false;
    const p = new Pool({
      connectionString,
      ssl,
      connectionTimeoutMillis: 5_000,
      query_timeout: 15_000,
      statement_timeout: 15_000,
      idleTimeoutMillis: 30_000,
    });
    // Without a listener, an idle client error throws and leaves the
    // module-cached pool in a broken state for every subsequent request.
    p.on("error", (err: Error) => {
      console.error("[pg] idle client error, resetting pool:", err.message);
      if (pool === p) pool = null;
      p.end().catch(() => {});
    });
    pool = p;
  }
  return pool;
}

export function resetPool() {
  const p = pool;
  pool = null;
  if (p) p.end().catch(() => {});
}
