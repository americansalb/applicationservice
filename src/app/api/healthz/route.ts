import { NextResponse } from "next/server";
import { getPool } from "@/lib/pg";
import { Client } from "pg";
import dns from "node:dns/promises";
import { DEV_BOOTSTRAP_EMAIL, devReclaimOpen } from "@/lib/appBootstrap";

export const dynamic = "force-dynamic";

const RENDER_REGIONS = ["oregon", "ohio", "virginia", "frankfurt", "singapore"];

export async function GET(req: Request) {
  const out: Record<string, unknown> = { marker: "healthz-diag-3" };
  const url = process.env.DATABASE_URL || "";
  const wantExternal =
    new URL(req.url).searchParams.get("probe") === "external";
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

  // External-host probe (only on ?probe=external): the internal host doesn't
  // resolve from this service, so try the database's public hostname in each
  // Render region to find which one actually accepts a connection. Whichever
  // returns ok:true tells us the region for the permanent fix.
  if (wantExternal && host && !host.includes(".")) {
    const results: Record<string, unknown> = {};
    for (const region of RENDER_REGIONS) {
      let cs = url;
      try {
        const u = new URL(url);
        u.hostname = `${host}.${region}-postgres.render.com`;
        if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
        cs = u.toString();
      } catch {
        /* keep original */
      }
      const c = new Client({
        connectionString: cs,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 8000,
        query_timeout: 5000,
        statement_timeout: 5000,
      });
      const t = Date.now();
      try {
        await c.connect();
        const r = await c.query("SELECT 1 AS ok");
        results[region] = { ok: true, ms: Date.now() - t, rows: r.rowCount };
      } catch (e) {
        const er = e as { code?: string; message?: string };
        results[region] = {
          ok: false,
          ms: Date.now() - t,
          code: er.code || null,
          message: (er.message || String(e)).slice(0, 90),
        };
      } finally {
        await c.end().catch(() => {});
      }
    }
    out.externalProbe = results;
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

  // Exact state of the bootstrap developer row — tells us why /portal/claim
  // is or isn't claimable (exists? role? mustChangePassword?).
  out.devReclaimOpen = devReclaimOpen();
  try {
    const r = await getPool().query(
      `SELECT role, "mustChangePassword" AS "mustChangePassword", status
         FROM app_user WHERE email = $1`,
      [DEV_BOOTSTRAP_EMAIL]
    );
    out.devAccount = r.rows[0] ? { exists: true, ...r.rows[0] } : { exists: false };
  } catch (e) {
    const err = e as { code?: string; message?: string };
    out.devAccount = { error: err.code || err.message || String(e) };
  }

  return NextResponse.json(out, { status: out.dbProbe && (out.dbProbe as { ok: boolean }).ok ? 200 : 503 });
}
