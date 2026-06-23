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
import {
  DEV_BOOTSTRAP_EMAIL,
  DEV_BOOTSTRAP_PASSWORD,
  devReclaimOpen,
} from "@/lib/appBootstrap";

export const dynamic = "force-dynamic";

// Set up the hardcoded developer account: create it if missing, or claim/reset
// it (while unclaimed or within the recovery window). Gated by the setup
// password; self-destructs once claimed and the recovery window has closed.
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

    // If the account exists it must be a DEVELOPER that's either unclaimed or
    // within the recovery window. If it's missing entirely, bootstrap it here
    // (the deploy-time seed never ran against this database). Both paths are
    // gated by the setup password checked above.
    if (
      user &&
      (user.role !== "DEVELOPER" ||
        (!user.mustChangePassword && !devReclaimOpen()))
    ) {
      return NextResponse.json(
        { error: "This setup has already been completed." },
        { status: 410 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    let userId: string;
    if (user) {
      await withDbRetry("portal.claim.write", () =>
        prisma.appUser.update({
          where: { id: user.id },
          data: { password: hashed, mustChangePassword: false },
        })
      );
      userId = user.id;
    } else {
      const created = await withDbRetry("portal.claim.create", () =>
        prisma.appUser.create({
          data: {
            email: DEV_BOOTSTRAP_EMAIL,
            name: "Kevin Thakkar",
            password: hashed,
            role: "DEVELOPER",
            mustChangePassword: false,
          },
          select: { id: true },
        })
      );
      userId = created.id;
    }

    // Log them straight in as the developer.
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: SESSION_COOKIE,
      value: signSession({ sub: userId, role: "DEVELOPER" }),
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
