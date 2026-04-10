const { spawn } = require("child_process");
const { readFileSync } = require("fs");
const { Pool } = require("pg");
const path = require("path");
const bcrypt = require("bcryptjs");

const port = process.env.PORT || 3000;

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL not set");
  }
  // Disable SSL for internal Render connections, enable for external
  const ssl = connectionString.includes("sslmode=")
    ? { rejectUnauthorized: false }
    : false;
  return new Pool({ connectionString, ssl });
}

async function setup() {
  const pool = createPool();

  try {
    // 1. Test basic connectivity
    console.log("[setup] Testing database connection...");
    const connTest = await pool.query("SELECT 1 as ok");
    console.log("[setup] Database connected:", connTest.rows[0]);

    // 2. Create tables
    console.log("[setup] Running migration SQL...");
    const migrationSQL = readFileSync(
      path.join(__dirname, "prisma", "migrations", "0_init", "migration.sql"),
      "utf8"
    );
    await pool.query(migrationSQL);
    console.log("[setup] Tables created/verified.");

    // 3. Verify tables exist
    const tables = await pool.query(
      `SELECT tablename FROM pg_tables WHERE tablename LIKE 'careers_%'`
    );
    console.log("[setup] Found tables:", tables.rows.map(r => r.tablename));

    // 4. Delete old admin
    await pool.query(
      `DELETE FROM "careers_admin_user" WHERE "email" = 'admin@aalb.org'`
    );

    // 5. Hash password and upsert admin
    const password = "Retard$macker1008";
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("[setup] Password hashed, upserting admin user...");

    await pool.query(
      `INSERT INTO "careers_admin_user" ("id", "email", "password", "name", "createdAt")
       VALUES (gen_random_uuid(), $1, $2, 'AALB Admin', NOW())
       ON CONFLICT ("email") DO UPDATE SET "password" = $2`,
      ["contact@aalb.org", hashedPassword]
    );

    // 6. Verify admin exists
    const verify = await pool.query(
      `SELECT "id", "email", "name" FROM "careers_admin_user" WHERE "email" = $1`,
      ["contact@aalb.org"]
    );
    console.log("[setup] Admin user verified:", verify.rows[0]);

    // 7. Verify password works
    if (verify.rows[0]) {
      const stored = await pool.query(
        `SELECT "password" FROM "careers_admin_user" WHERE "email" = $1`,
        ["contact@aalb.org"]
      );
      const matches = await bcrypt.compare(password, stored.rows[0].password);
      console.log("[setup] Password verification:", matches ? "PASS" : "FAIL");
    }

    console.log("[setup] Setup complete.");
  } catch (e) {
    console.error("[setup] FATAL ERROR:", e);
  } finally {
    await pool.end();
  }
}

setup().then(() => {
  const child = spawn("npx", ["next", "start", "-p", String(port)], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code) => {
    process.exit(code);
  });
});
