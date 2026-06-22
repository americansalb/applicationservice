// Local-only demo data for the evaluation platform, so the role dashboards
// have realistic content during development. NOT wired into production boot.
//
//   node scripts/seed-portal-demo.mjs
//
// Logins (portal at /portal/login):
//   Developer    payments@aalb.org   DevPass!2345
//   Manager      manager@uhnj.org    Manager!2345   (University Hospital)
//   Professional diego@example.org   Prof!2345
//   Bootstrap    kevin@aalb.org      claim at /portal/claim
import "dotenv/config";
import pg from "pg";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

async function ensureOrg(name) {
  const found = await pool.query(
    `SELECT id FROM app_organization WHERE name = $1 LIMIT 1`,
    [name]
  );
  if (found.rows.length) return found.rows[0].id;
  const { rows } = await pool.query(
    `INSERT INTO app_organization (id, name, status, "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, 'active', NOW(), NOW()) RETURNING id`,
    [name]
  );
  return rows[0].id;
}

async function upsert({
  email,
  password,
  name,
  role,
  organizationId = null,
  managerId = null,
  mustChange = false,
}) {
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO app_user
       (id, email, password, name, role, status, "mustChangePassword", "managerId", "organizationId", "createdAt", "updatedAt")
     VALUES (gen_random_uuid(), $1, $2, $3, $4, 'active', $5, $6, $7, NOW(), NOW())
     ON CONFLICT (email) DO UPDATE
       SET password = $2, name = $3, role = $4, "mustChangePassword" = $5,
           "managerId" = $6, "organizationId" = $7, "updatedAt" = NOW()
     RETURNING id`,
    [email.toLowerCase(), hash, name, role, mustChange, managerId, organizationId]
  );
  return rows[0].id;
}

async function main() {
  const orgId = await ensureOrg("University Hospital");

  await upsert({
    email: "payments@aalb.org",
    password: "DevPass!2345",
    name: "AALB Developer",
    role: "DEVELOPER",
  });
  await upsert({
    email: "kevin@aalb.org",
    password: randomUUID() + randomUUID(),
    name: "Kevin Thakkar",
    role: "DEVELOPER",
    mustChange: true,
  });

  const managerId = await upsert({
    email: "manager@uhnj.org",
    password: "Manager!2345",
    name: "Lawrenda Henry-Willis",
    role: "MANAGER",
    organizationId: orgId,
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
      organizationId: orgId,
      managerId,
    });
  }

  await upsert({
    email: "newhire@example.org",
    password: "Temp!2345",
    name: "Sam Newhire",
    role: "PROFESSIONAL",
    organizationId: orgId,
    managerId,
    mustChange: true,
  });

  console.log("Demo data seeded (University Hospital org + users).");
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
