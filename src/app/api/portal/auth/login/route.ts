import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { isConnectivityError, withDbRetry } from "@/lib/dbRetry";
import { checkRateLimit } from "@/lib/rateLimit";
import { clientIp, isSameOrigin } from "@/lib/appRequest";
import {
  signSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  type AppRole,
} from "@/lib/appAuth";

export const dynamic = "force-dynamic";

// A real bcrypt hash we compare against when the account doesn't exist, so a
// missing email costs the same time as a wrong password (no user enumeration).
const DUMMY_HASH = bcrypt.hashSync("unused-placeholder-password", 12);

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const ip = clientIp(req);
    const rl = checkRateLimit(`portal-login:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
        }
      );
    }

    const body = await req.json().catch(() => null);
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    // Bound inputs (bcrypt only uses the first 72 bytes; huge bodies are abuse).
    if (!email || !password || email.length > 320 || password.length > 200) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const user = await withDbRetry("portal.login", () =>
      prisma.appUser.findUnique({ where: { email } })
    );
    const valid = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

    // Single generic message for every failure mode (no email/password leak).
    if (!user || user.status !== "active" || !valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const token = signSession({ sub: user.id, role: user.role as AppRole });
    const res = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
    res.cookies.set({
      name: SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (e) {
    console.error("portal login error:", e);
    const connectivity = isConnectivityError(e);
    return NextResponse.json(
      {
        error: connectivity
          ? "Service temporarily unavailable. Please try again shortly."
          : "Login failed.",
      },
      { status: connectivity ? 503 : 500 }
    );
  }
}
