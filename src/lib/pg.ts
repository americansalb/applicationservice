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
    pool = new Pool({ connectionString, ssl });
  }
  return pool;
}
