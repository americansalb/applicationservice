import { NextResponse } from "next/server";
import { getPool } from "@/lib/pg";

export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = {};
  const url = process.env.DATABASE_URL || "";
  // Redact the password so we can paste this safely.
  out.databaseUrl = url
    ? url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@")
    : "(unset)";
  out.hasSslmodeInUrl = url.includes("sslmode=");
  // Pull just the host portion for clarity.
  try {
    const u = new URL(url);
    out.host = u.hostname;
    out.port = u.port || "(default 5432)";
    out.database = u.pathname.replace(/^\//, "");
  } catch {
    out.host = "(unparseable)";
  }

  // Probe the pool with a SELECT 1 + timing. This bypasses all the
  // app-level retry logic so we see the raw connection behaviour.
  const t0 = Date.now();
  try {
    const r = await getPool().query("SELECT 1 AS ok");
    out.dbProbe = {
      ok: true,
      ms: Date.now() - t0,
      rows: r.rowCount,
    };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    out.dbProbe = {
      ok: false,
      ms: Date.now() - t0,
      code: err.code || null,
      message: err.message || String(e),
    };
  }

  // Show whether the careers_admin_user table actually has the row login is checking.
  try {
    const r = await getPool().query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM "careers_admin_user"`
    );
    out.adminUserCount = Number(r.rows[0]?.count ?? 0);
  } catch (e) {
    const err = e as { code?: string; message?: string };
    out.adminUserCount = {
      error: err.code || err.message || String(e),
    };
  }

  return NextResponse.json(out, { status: out.dbProbe && (out.dbProbe as { ok: boolean }).ok ? 200 : 503 });
}
