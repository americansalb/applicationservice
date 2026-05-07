import { Pool } from "pg";
import { sslConfigForUrl } from "./dbSsl";

export * from "./partnersSchema";

let pool: Pool | null = null;

export function getPartnersPool() {
  if (!pool) {
    const connectionString = process.env.PARTNERS_DATABASE_URL;
    if (!connectionString) {
      throw new Error("PARTNERS_DATABASE_URL is not set");
    }
    const ssl = sslConfigForUrl(connectionString);
    const p = new Pool({
      connectionString,
      ssl,
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
