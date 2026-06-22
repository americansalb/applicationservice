// Local-only demo data for the evaluation platform, so the role dashboards
// have realistic content during development. NOT wired into production boot.
//
//   node scripts/seed-portal-demo.mjs
//
// Logins (all dark-teal/white portal at /portal/login):
//   Developer    payments@aalb.org   DevPass!2345
//   Manager      manager@uhnj.org    Manager!2345
//   Professional diego@example.org   Prof!2345
//   New hire     newhire@example.org Temp!2345   (forced to set a password)
import "dotenv/config";
import pg from "pg";
import bcrypt from "bcryptjs";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function upsert({ email, password, name, role, managerId = null, mustChange = false }) {
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO "app_user"
       ("id","email","password","name","role","status","mustChangePassword","managerId","createdAt","updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', $5, $6, NOW(), NOW())
     ON CONFLICT ("email") DO UPDATE
       SET "password" = $2, "name" = $3, "role" = $4,
           "mustChangePassword" = $5, "managerId" = $6, "updatedAt" = NOW()
     RETURNING "id"`,
    [email.toLowerCase(), hash, name, role, mustChange, managerId]
  );
  return rows[0].id;
}

async function main() {
  await upsert({
    email: "payments@aalb.org",
    password: "DevPass!2345",
    name: "AALB Developer",
    role: "DEVELOPER",
  });

  const managerId = await upsert({
    email: "manager@uhnj.org",
    password: "Manager!2345",
    name: "Lawrenda Henry-Willis",
    role: "MANAGER",
  });

  const professionals = [
    ["maria@example.org", "Maria González"],
    ["chen@example.org", "Chen Wei"],
    ["amara@example.org", "Amara Okafor"],
    ["diego@example.org", "Diego Romero"],
  ];
  for (const [email, name] of professionals) {
    await upsert({
      email,
      password: "Prof!2345",
      name,
      role: "PROFESSIONAL",
      managerId,
    });
  }

  // An account that still has to set its own password (forced-reset screen).
  await upsert({
    email: "newhire@example.org",
    password: "Temp!2345",
    name: "Sam Newhire",
    role: "PROFESSIONAL",
    managerId,
    mustChange: true,
  });

  console.log("Demo data seeded.");
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
