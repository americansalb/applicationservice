const { spawn, execSync } = require("child_process");
const { readFileSync } = require("fs");
const { Pool } = require("pg");
const path = require("path");

const port = process.env.PORT || 3000;

async function setup() {
  // Run migration SQL to create tables if they don't exist
  if (process.env.DATABASE_URL) {
    try {
      console.log("Ensuring database tables exist...");
      const pool = new Pool({ connectionString: process.env.DATABASE_URL });
      const migrationSQL = readFileSync(
        path.join(__dirname, "prisma", "migrations", "0_init", "migration.sql"),
        "utf8"
      );
      await pool.query(migrationSQL);
      await pool.end();
      console.log("Tables ready.");
    } catch (e) {
      console.error("Migration failed (continuing):", e.message);
    }
  }

  // Run seed to create/update admin user and sample jobs
  try {
    console.log("Running database seed...");
    execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: process.env });
    console.log("Seed complete.");
  } catch (e) {
    console.error("Seed failed (continuing):", e.message);
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
