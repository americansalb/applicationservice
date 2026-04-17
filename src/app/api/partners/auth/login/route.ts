import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getPartnersPool } from "@/lib/partnersDb";
import { signPartnerToken } from "@/lib/partnersAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { logAudit } from "@/lib/auditLog";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`partner-login:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const pool = getPartnersPool();

    // Try admin first, then partner
    const adminRes = await pool.query(
      `SELECT "id", "email", "password", "name" FROM "partners_admin_user" WHERE "email" = $1 LIMIT 1`,
      [email]
    );
    if (adminRes.rows.length > 0) {
      const admin = adminRes.rows[0];
      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) {
        return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
      }
      const token = signPartnerToken({
        id: admin.id,
        email: admin.email,
        role: "admin",
      });
      await logAudit({ action: "login", userId: admin.id, userRole: "admin", userEmail: admin.email, ip });
      return NextResponse.json({
        token,
        role: "admin",
        user: { id: admin.id, email: admin.email, name: admin.name },
      });
    }

    const partnerRes = await pool.query(
      `SELECT u."id", u."email", u."password", u."name", u."organizationId",
              o."name" as "organizationName"
       FROM "partners_user" u
       JOIN "partners_organization" o ON o."id" = u."organizationId"
       WHERE u."email" = $1 LIMIT 1`,
      [email]
    );
    if (partnerRes.rows.length === 0) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    const partner = partnerRes.rows[0];
    const valid = await bcrypt.compare(password, partner.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const token = signPartnerToken({
      id: partner.id,
      email: partner.email,
      role: "partner",
      organizationId: partner.organizationId,
    });

    await logAudit({ action: "login", userId: partner.id, userRole: "partner", userEmail: partner.email, organizationId: partner.organizationId, ip });
    return NextResponse.json({
      token,
      role: "partner",
      user: {
        id: partner.id,
        email: partner.email,
        name: partner.name,
        organizationId: partner.organizationId,
        organizationName: partner.organizationName,
      },
    });
  } catch (e) {
    console.error("partner login error:", e);
    const message = e instanceof Error ? e.message : "Login failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
