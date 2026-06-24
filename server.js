const { spawn } = require("child_process");
const { readFileSync, readdirSync, statSync } = require("fs");
const { Pool } = require("pg");
const path = require("path");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

// Order migration directories by their numeric prefix ("0_init", "1_...",
// "10_..."). A plain string sort places "10_" before "2_", which would run a
// later migration before the table it depends on exists. Numeric ordering keeps
// 0 through 9 exactly as before and makes 10+ apply in the intended sequence.
function byMigrationOrder(a, b) {
  const na = parseInt(a, 10);
  const nb = parseInt(b, 10);
  if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
}

function readMigrationsInOrder(migrationsDir) {
  const entries = readdirSync(migrationsDir)
    .filter((name) => {
      const full = path.join(migrationsDir, name);
      try {
        return statSync(full).isDirectory();
      } catch {
        return false;
      }
    })
    .sort(byMigrationOrder);
  return entries
    .map((name) => path.join(migrationsDir, name, "migration.sql"))
    .filter((p) => {
      try {
        return statSync(p).isFile();
      } catch {
        return false;
      }
    })
    .map((p) => ({ file: p, sql: readFileSync(p, "utf8") }));
}

const port = process.env.PORT || 3000;

// Render's bare internal hostnames ("dpg-xxxx-a", no dot) only resolve on the
// private network. This service isn't on it, so the internal name fails DNS
// entirely (getaddrinfo ENOTFOUND) and the background DB setup below never runs
// — which is why the platform tables were missing. Rewrite to the database's
// PUBLIC hostname (over TLS) so boot-time setup can reach it from anywhere.
function externalizeRenderHost(connectionString) {
  try {
    const u = new URL(connectionString);
    if (/^dpg-[a-z0-9-]+$/i.test(u.hostname)) {
      const region = process.env.RENDER_DB_REGION || "ohio";
      u.hostname = `${u.hostname}.${region}-postgres.render.com`;
      if (!u.searchParams.has("sslmode")) u.searchParams.set("sslmode", "require");
      return u.toString();
    }
  } catch {}
  return connectionString;
}

function createPool(connectionString) {
  if (!connectionString) return null;
  const cs = externalizeRenderHost(connectionString);
  // External hostnames (with dots) require SSL; bare internal hosts don't.
  let ssl = false;
  try {
    const u = new URL(cs);
    if (u.hostname.includes(".")) ssl = { rejectUnauthorized: false };
  } catch {}
  return new Pool({
    connectionString: cs,
    ssl,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
  });
}

async function setupCareers() {
  const pool = createPool(process.env.DATABASE_URL);
  if (!pool) {
    console.log("[careers] DATABASE_URL not set, skipping");
    return;
  }

  try {
    console.log("[careers] Connecting...");
    await pool.query("SELECT 1");

    const migrations = readMigrationsInOrder(
      path.join(__dirname, "prisma", "migrations")
    );
    for (const { file, sql } of migrations) {
      const name = path.basename(path.dirname(file));
      // Migrations are idempotent and additive, so one failing must not block the
      // rest (or the seeding below). Log loudly and keep going.
      try {
        console.log(`[careers] Applying ${name}...`);
        await pool.query(sql);
      } catch (e) {
        console.error(`[careers] Migration ${name} FAILED (continuing):`, e.message);
      }
    }

    await pool.query(
      `DELETE FROM "careers_admin_user" WHERE "email" = 'admin@aalb.org'`
    );

    const adminEmail = process.env.ADMIN_EMAIL || "contact@aalb.org";
    const adminPass = process.env.ADMIN_PASSWORD;
    if (adminPass) {
      const hashedPassword = await bcrypt.hash(adminPass, 12);
      await pool.query(
        `INSERT INTO "careers_admin_user" ("id", "email", "password", "name", "createdAt")
         VALUES (gen_random_uuid(), $1, $2, 'AALB Admin', NOW())
         ON CONFLICT ("email") DO UPDATE SET "password" = $2`,
        [adminEmail, hashedPassword]
      );
    }

    // Seed the hardcoded platform DEVELOPER (kevin@aalb.org) as a one-time
    // claimable account: created only if absent, with an unusable random
    // password and mustChangePassword=true. He sets his real password once via
    // /portal/claim, which then self-destructs. Create-only (DO NOTHING) so a
    // redeploy never clobbers the password he has already set.
    {
      const bootstrapEmail = "kevin@aalb.org";
      const randomPw = await bcrypt.hash(
        crypto.randomUUID() + crypto.randomUUID(),
        12
      );
      await pool.query(
        `INSERT INTO "app_user"
           ("id", "email", "password", "name", "role", "status", "mustChangePassword", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), $1, $2, 'Kevin Thakkar', 'DEVELOPER', 'active', true, NOW(), NOW())
         ON CONFLICT ("email") DO NOTHING`,
        [bootstrapEmail, randomPw]
      );
      console.log("[platform] Bootstrap developer ensured:", bootstrapEmail);
    }

    console.log("[careers] Setup complete.");
  } catch (e) {
    console.error("[careers] ERROR:", e.message);
  } finally {
    await pool.end().catch(() => {});
  }
}

async function setupPartners() {
  const pool = createPool(process.env.PARTNERS_DATABASE_URL);
  if (!pool) {
    console.log("[partners] PARTNERS_DATABASE_URL not set, skipping");
    return;
  }

  try {
    console.log("[partners] Connecting...");
    await pool.query("SELECT 1");

    const migrations = readMigrationsInOrder(
      path.join(__dirname, "prisma", "partners_migrations")
    );
    for (const { file, sql } of migrations) {
      console.log(`[partners] Applying ${path.basename(path.dirname(file))}...`);
      await pool.query(sql);
    }
    console.log("[partners] Tables created/verified.");

    const pAdminEmail = process.env.ADMIN_EMAIL || "contact@aalb.org";
    const pAdminPass = process.env.ADMIN_PASSWORD;
    if (pAdminPass) {
      const hashedAdmin = await bcrypt.hash(pAdminPass, 12);
      await pool.query(
        `INSERT INTO "partners_admin_user" ("id", "email", "password", "name", "createdAt")
         VALUES ($1, $2, $3, 'AALB Admin', NOW())
         ON CONFLICT ("email") DO UPDATE SET "password" = $3`,
        [crypto.randomUUID(), pAdminEmail, hashedAdmin]
      );
    }

    // Seed University Hospital (first-run only)
    const orgName = "University Hospital";
    const existingOrg = await pool.query(
      `SELECT "id" FROM "partners_organization" WHERE "name" = $1`,
      [orgName]
    );
    let orgId;
    if (existingOrg.rows.length === 0) {
      orgId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO "partners_organization"
         ("id", "name", "address", "contactName", "contactEmail", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
        [
          orgId,
          orgName,
          "150 Bergen Street, Newark, New Jersey 07103",
          "Lawrenda Henry-Willis",
          "henrywla@uhnj.org",
        ]
      );
      console.log("[partners] Seeded University Hospital org.");
    } else {
      orgId = existingOrg.rows[0].id;
    }

    // Seed partner user (first-run only, uses temp password from env)
    const partnerEmail = "henrywla@uhnj.org";
    const partnerPassword = process.env.SEED_PARTNER_PASSWORD || "changeme123";
    const hashedPartner = await bcrypt.hash(partnerPassword, 12);
    await pool.query(
      `INSERT INTO "partners_user" ("id", "email", "password", "name", "organizationId", "createdAt")
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT ("email") DO UPDATE SET "password" = $3, "organizationId" = $5`,
      [
        crypto.randomUUID(),
        partnerEmail,
        hashedPartner,
        "Lawrenda Henry-Willis",
        orgId,
      ]
    );

    console.log("[partners] Setup complete.");
  } catch (e) {
    console.error("[partners] ERROR:", e.message);
  } finally {
    await pool.end().catch(() => {});
  }
}

// Ensure a stable session-signing secret exists WITHOUT requiring an env var.
// Order matters: we set process.env.APP_JWT_SECRET *before* spawning Next so
// the child process inherits it (appAuth.getSecret reads it). An explicitly
// configured APP_JWT_SECRET / JWT_SECRET always takes precedence. The secret is
// persisted in app_platform_config so it stays stable across deploys/restarts.
async function ensureJwtSecret() {
  if (process.env.APP_JWT_SECRET || process.env.JWT_SECRET) return;
  const pool = createPool(process.env.DATABASE_URL);
  if (!pool) return;
  try {
    await pool.query(
      `CREATE TABLE IF NOT EXISTS "app_platform_config" ("key" TEXT PRIMARY KEY, "value" TEXT NOT NULL)`
    );
    const generated = crypto.randomBytes(48).toString("hex");
    await pool.query(
      `INSERT INTO "app_platform_config" ("key", "value") VALUES ('app_jwt_secret', $1)
       ON CONFLICT ("key") DO NOTHING`,
      [generated]
    );
    const r = await pool.query(
      `SELECT "value" FROM "app_platform_config" WHERE "key" = 'app_jwt_secret'`
    );
    const secret = r.rows[0] && r.rows[0].value;
    if (secret) {
      process.env.APP_JWT_SECRET = secret;
      console.log("[platform] Session signing secret ready (app_platform_config).");
    } else {
      console.error("[platform] ensureJwtSecret: no secret returned");
    }
  } catch (e) {
    console.error("[platform] ensureJwtSecret ERROR:", e.message);
  } finally {
    await pool.end().catch(() => {});
  }
}

// Provision the session-signing secret first (sets process.env), then start
// Next so the child inherits it. DB table/seed setup still runs in background.
ensureJwtSecret().finally(() => {
  const child = spawn("npx", ["next", "start", "-p", String(port)], {
    stdio: "inherit",
    env: process.env,
  });
  child.on("exit", (code) => process.exit(code));

  // Kick off DB setup in the background, don't block port binding
  Promise.allSettled([setupCareers(), setupPartners()]).then((results) => {
    results.forEach((r, i) => {
      const name = i === 0 ? "careers" : "partners";
      if (r.status === "rejected") {
        console.error(`[${name}] setup rejected:`, r.reason);
      }
    });
    console.log("[setup] All DB setup tasks finished.");
  });
});
