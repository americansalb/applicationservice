const { spawn } = require("child_process");
const { readFileSync } = require("fs");
const { Pool } = require("pg");
const path = require("path");
const bcrypt = require("bcryptjs");

const port = process.env.PORT || 3000;

async function setup() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set, skipping setup.");
    return;
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    // Create tables if they don't exist
    console.log("Ensuring database tables exist...");
    const migrationSQL = readFileSync(
      path.join(__dirname, "prisma", "migrations", "0_init", "migration.sql"),
      "utf8"
    );
    await pool.query(migrationSQL);
    console.log("Tables ready.");

    // Delete old admin user if exists
    await pool.query(`DELETE FROM "careers_admin_user" WHERE "email" = 'admin@aalb.org'`);

    // Upsert admin user
    const hashedPassword = await bcrypt.hash("Retard$macker1008", 10);
    await pool.query(
      `INSERT INTO "careers_admin_user" ("id", "email", "password", "name", "createdAt")
       VALUES (gen_random_uuid(), 'contact@aalb.org', $1, 'AALB Admin', NOW())
       ON CONFLICT ("email") DO UPDATE SET "password" = $1`,
      [hashedPassword]
    );
    console.log("Admin user ready.");
  } catch (e) {
    console.error("Setup error:", e.message);
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
