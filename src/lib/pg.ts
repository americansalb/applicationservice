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
      // Force IPv4 DNS resolution. Render's internal hostnames
      // (dpg-XXXX-a, no .com) sometimes return AAAA records that the
      // web service's network can't actually reach, which surfaces as
      // intermittent "Can't reach database server" errors. IPv4 is
      // reliable inside Render's private network.
      // @ts-expect-error: pg accepts `family` but its types don't expose it.
      family: 4,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
      connectionTimeoutMillis: 5_000,
      query_timeout: 15_000,
      statement_timeout: 15_000,
      idleTimeoutMillis: 30_000,
    });
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
