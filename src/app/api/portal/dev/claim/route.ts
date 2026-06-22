import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { withDbRetry, isConnectivityError } from "@/lib/dbRetry";
import { validatePassword } from "@/lib/passwordPolicy";
import { checkRateLimit } from "@/lib/rateLimit";
import { clientIp, isSameOrigin } from "@/lib/appRequest";
import {
  signSession,
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
} from "@/lib/appAuth";
import { DEV_BOOTSTRAP_EMAIL, DEV_BOOTSTRAP_PASSWORD } from "@/lib/appBootstrap";

export const dynamic = "force-dynamic";

// Claim the hardcoded developer account once. Self-destructs: only works while
// the account is still flagged mustChangePassword (i.e. not yet claimed).
export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const rl = checkRateLimit(`portal-claim:${clientIp(req)}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
        }
      );
    }

    const body = await req.json().catch(() => null);
    const setupPassword =
      typeof body?.setupPassword === "string" ? body.setupPassword : "";
    const newPassword =
      typeof body?.newPassword === "string" ? body.newPassword : "";

    if (setupPassword !== DEV_BOOTSTRAP_PASSWORD) {
      return NextResponse.json({ error: "Invalid setup password." }, { status: 403 });
    }

    const policyError = validatePassword(newPassword);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    const user = await withDbRetry("portal.claim.read", () =>
      prisma.appUser.findUnique({ where: { email: DEV_BOOTSTRAP_EMAIL } })
    );

    // Self-destruct: already claimed (or missing / wrong role) => refuse.
    if (!user || user.role !== "DEVELOPER" || !user.mustChangePassword) {
      return NextResponse.json(
        { error: "This setup has already been completed." },
        { status: 410 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await withDbRetry("portal.claim.write", () =>
      prisma.appUser.update({
        where: { id: user.id },
        data: { password: hashed, mustChangePassword: false },
      })
    );

    // Log them straight in as the developer.
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: SESSION_COOKIE,
      value: signSession({ sub: user.id, role: "DEVELOPER" }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (e) {
    console.error("portal claim error:", e);
    const connectivity = isConnectivityError(e);
    return NextResponse.json(
      {
        error: connectivity
          ? "Service temporarily unavailable. Please try again shortly."
          : "Could not complete setup.",
      },
      { status: connectivity ? 503 : 500 }
    );
  }
}
