import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { withDbRetry, isConnectivityError } from "@/lib/dbRetry";
import { userFromToken } from "@/lib/appSession";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  signSession,
} from "@/lib/appAuth";
import { validatePassword } from "@/lib/passwordPolicy";
import { checkRateLimit } from "@/lib/rateLimit";
import { clientIp, isSameOrigin } from "@/lib/appRequest";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const rl = checkRateLimit(`portal-pw:${clientIp(req)}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
        }
      );
    }

    const session = await userFromToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const currentPassword =
      typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword =
      typeof body?.newPassword === "string" ? body.newPassword : "";
    if (currentPassword.length > 200 || newPassword.length > 200) {
      return NextResponse.json({ error: "Invalid password." }, { status: 400 });
    }

    const policyError = validatePassword(newPassword);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    const user = await withDbRetry("portal.pw.read", () =>
      prisma.appUser.findUnique({
        where: { id: session.id },
        select: { id: true, password: true },
      })
    );
    if (!user) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Your current password is incorrect." },
        { status: 400 }
      );
    }
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password must be different from the current one." },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await withDbRetry("portal.pw.write", () =>
      prisma.appUser.update({
        where: { id: user.id },
        data: { password: hashed, mustChangePassword: false },
      })
    );

    // Rotate the session token so the new credentials take immediate effect.
    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: SESSION_COOKIE,
      value: signSession({ sub: session.id, role: session.role }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (e) {
    console.error("portal change-password error:", e);
    const connectivity = isConnectivityError(e);
    return NextResponse.json(
      {
        error: connectivity
          ? "Service temporarily unavailable. Please try again shortly."
          : "Could not update your password.",
      },
      { status: connectivity ? 503 : 500 }
    );
  }
}
