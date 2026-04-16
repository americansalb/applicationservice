const { spawn } = require("child_process");
const { readFileSync } = require("fs");
const { Pool } = require("pg");
const path = require("path");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const port = process.env.PORT || 3000;

function createPool(connectionString) {
  if (!connectionString) return null;
  const ssl = connectionString.includes("sslmode=")
    ? { rejectUnauthorized: false }
    : false;
  return new Pool({
    connectionString,
    ssl,
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

    const migrationSQL = readFileSync(
      path.join(__dirname, "prisma", "migrations", "0_init", "migration.sql"),
      "utf8"
    );
    await pool.query(migrationSQL);

    await pool.query(
      `DELETE FROM "careers_admin_user" WHERE "email" = 'admin@aalb.org'`
    );

    const hashedPassword = await bcrypt.hash("Retard$macker1008", 10);
    await pool.query(
      `INSERT INTO "careers_admin_user" ("id", "email", "password", "name", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, 'AALB Admin', NOW())
       ON CONFLICT ("email") DO UPDATE SET "password" = $2`,
      ["contact@aalb.org", hashedPassword]
    );
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

    const migrationSQL = readFileSync(
      path.join(
        __dirname,
        "prisma",
        "partners_migrations",
        "0_init",
        "migration.sql"
      ),
      "utf8"
    );
    await pool.query(migrationSQL);
    console.log("[partners] Tables created/verified.");

    const adminEmail = "contact@aalb.org";
    const adminPassword = "Retard$macker1008";
    const hashedAdmin = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      `INSERT INTO "partners_admin_user" ("id", "email", "password", "name", "createdAt")
       VALUES ($1, $2, $3, 'AALB Admin', NOW())
       ON CONFLICT ("email") DO UPDATE SET "password" = $3`,
      [crypto.randomUUID(), adminEmail, hashedAdmin]
    );

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

    const partnerEmail = "henrywla@uhnj.org";
    const partnerPassword = "changeme123";
    const hashedPartner = await bcrypt.hash(partnerPassword, 10);
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

// Start Next.js immediately so Render sees the port binding fast.
// Database setup runs in the background so a slow/unreachable DB can't
// prevent the app from starting.
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
