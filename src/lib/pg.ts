import { Pool } from "pg";
import { sslConfigForUrl, externalizeRenderHost } from "./dbSsl";

let pool: Pool | null = null;

export function getPool() {
  if (!pool) {
    const raw = process.env.DATABASE_URL;
    if (!raw) {
      throw new Error("DATABASE_URL not set");
    }
    const connectionString = externalizeRenderHost(raw);
    const ssl = sslConfigForUrl(connectionString);
    const p = new Pool({
      connectionString,
      ssl,
      // Let DNS resolve IPv4 *or* IPv6. Render's private network uses IPv6 for
      // internal database hostnames (dpg-XXXX-a resolve to AAAA records only),
      // so forcing IPv4 makes the lookup fail with getaddrinfo ENOTFOUND.
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
