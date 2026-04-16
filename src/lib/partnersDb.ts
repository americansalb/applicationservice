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
    pool = new Pool({ connectionString, ssl });
  }
  return pool;
}
