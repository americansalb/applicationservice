import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { withDbRetry, isConnectivityError } from "@/lib/dbRetry";
import { userFromToken } from "@/lib/appSession";
import { SESSION_COOKIE, isAppRole, type AppRole } from "@/lib/appAuth";
import { validatePassword } from "@/lib/passwordPolicy";
import { checkRateLimit } from "@/lib/rateLimit";
import { clientIp, isSameOrigin } from "@/lib/appRequest";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function serviceError(e: unknown) {
  console.error("portal users error:", e);
  const connectivity = isConnectivityError(e);
  return NextResponse.json(
    {
      error: connectivity
        ? "Service temporarily unavailable. Please try again shortly."
        : "Something went wrong.",
    },
    { status: connectivity ? 503 : 500 }
  );
}

// GET: list accounts visible to the caller.
//   DEVELOPER     -> everyone
//   MANAGER       -> only their own professionals
//   PROFESSIONAL  -> nothing (they have no roster)
export async function GET(req: NextRequest) {
  try {
    const session = await userFromToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const select = {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      managerId: true,
      createdAt: true,
    } as const;

    if (session.role === "DEVELOPER") {
      const users = await withDbRetry("portal.users.list", () =>
        prisma.appUser.findMany({
          orderBy: [{ role: "asc" }, { createdAt: "asc" }],
          select,
        })
      );
      return NextResponse.json({ users });
    }

    if (session.role === "MANAGER") {
      const users = await withDbRetry("portal.users.list", () =>
        prisma.appUser.findMany({
          where: { managerId: session.id, role: "PROFESSIONAL" },
          orderBy: { createdAt: "asc" },
          select,
        })
      );
      return NextResponse.json({ users });
    }

    return NextResponse.json({ users: [] });
  } catch (e) {
    return serviceError(e);
  }
}

// POST: create an account.
//   DEVELOPER -> may create MANAGER or PROFESSIONAL (optionally assigning a
//               professional to a manager).
//   MANAGER   -> may create PROFESSIONAL, always under themselves.
export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const session = await userFromToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    if (session.role === "PROFESSIONAL") {
      return NextResponse.json(
        { error: "You do not have permission to create accounts." },
        { status: 403 }
      );
    }

    const rl = checkRateLimit(`portal-create:${clientIp(req)}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
        }
      );
    }

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const role = body?.role;
    let managerId: string | null =
      typeof body?.managerId === "string" && body.managerId ? body.managerId : null;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and a temporary password are required." },
        { status: 400 }
      );
    }
    if (name.length > 200 || email.length > 320 || password.length > 200) {
      return NextResponse.json({ error: "One or more fields are too long." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    if (!isAppRole(role) || role === "DEVELOPER") {
      return NextResponse.json(
        { error: "Choose a role: Manager or Professional." },
        { status: 400 }
      );
    }

    // Authorisation matrix.
    if (session.role === "MANAGER") {
      if (role !== "PROFESSIONAL") {
        return NextResponse.json(
          { error: "Managers can only add professionals." },
          { status: 403 }
        );
      }
      managerId = session.id;
    }

    if (role === "PROFESSIONAL" && managerId) {
      const mgr = await withDbRetry("portal.users.mgr", () =>
        prisma.appUser.findUnique({ where: { id: managerId as string } })
      );
      if (!mgr || mgr.role !== "MANAGER") {
        return NextResponse.json(
          { error: "Selected manager was not found." },
          { status: 400 }
        );
      }
    } else if (role === "MANAGER") {
      managerId = null;
    }

    const policyError = validatePassword(password);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    const existing = await withDbRetry("portal.users.exists", () =>
      prisma.appUser.findUnique({ where: { email } })
    );
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);
    const created = await withDbRetry("portal.users.create", () =>
      prisma.appUser.create({
        data: {
          name,
          email,
          password: hashed,
          role: role as AppRole,
          managerId,
          mustChangePassword: true,
          createdById: session.id,
        },
        select: { id: true, name: true, email: true, role: true, managerId: true },
      })
    );

    return NextResponse.json({ user: created }, { status: 201 });
  } catch (e) {
    return serviceError(e);
  }
}
