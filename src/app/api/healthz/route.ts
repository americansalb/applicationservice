import { NextResponse } from "next/server";
import { getPool } from "@/lib/pg";
import dns from "node:dns/promises";

export const dynamic = "force-dynamic";

export async function GET() {
  const out: Record<string, unknown> = { marker: "healthz-dns-diag-1" };
  const url = process.env.DATABASE_URL || "";
  // Redact the password so we can paste this safely.
  out.databaseUrl = url
    ? url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:***@")
    : "(unset)";
  out.hasSslmodeInUrl = url.includes("sslmode=");
  // Pull just the host portion for clarity.
  let host = "";
  try {
    const u = new URL(url);
    host = u.hostname;
    out.host = host;
    out.port = u.port || "(default 5432)";
    out.database = u.pathname.replace(/^\//, "");
  } catch {
    out.host = "(unparseable)";
  }

  // DNS diagnostics: what records does the DB host actually have, and via
  // which family does it resolve? Distinguishes IPv4-only vs IPv6-only vs
  // not-resolvable-at-all from this service's network.
  if (host) {
    const probe = async (fn: () => Promise<unknown>) => {
      try {
        return await fn();
      } catch (e) {
        const er = e as { code?: string; message?: string };
        return { error: er.code || er.message || String(e) };
      }
    };
    out.dns = {
      lookupDefault: await probe(() => dns.lookup(host)),
      lookupV4: await probe(() => dns.lookup(host, { family: 4 })),
      lookupV6: await probe(() => dns.lookup(host, { family: 6 })),
      resolveA: await probe(() => dns.resolve4(host)),
      resolveAAAA: await probe(() => dns.resolve6(host)),
    };
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
