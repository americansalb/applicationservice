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
  type AppRole,
} from "@/lib/appAuth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }
    const rl = checkRateLimit(`portal-accept:${clientIp(req)}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) },
        }
      );
    }

    const token = params.token;
    const body = await req.json().catch(() => null);
    const password = typeof body?.password === "string" ? body.password : "";
    const providedName =
      typeof body?.name === "string" ? body.name.trim() : "";

    const policyError = validatePassword(password);
    if (policyError) {
      return NextResponse.json({ error: policyError }, { status: 400 });
    }

    const invite = await withDbRetry("portal.accept.read", () =>
      prisma.invitation.findUnique({ where: { token } })
    );
    if (
      !invite ||
      invite.status !== "pending" ||
      invite.expiresAt.getTime() < Date.now()
    ) {
      return NextResponse.json(
        { error: "This invitation is invalid or has expired." },
        { status: 410 }
      );
    }

    const name = (providedName || invite.name || "").trim();
    if (!name) {
      return NextResponse.json(
        { error: "Please enter your full name." },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 12);

    let user: { id: string; role: string };
    try {
      user = await withDbRetry("portal.accept.commit", () =>
        prisma.$transaction(async (tx) => {
          const created = await tx.appUser.create({
            data: {
              email: invite.email,
              name,
              password: hashed,
              role: invite.role as AppRole,
              organizationId: invite.organizationId,
              createdById: invite.invitedById,
              mustChangePassword: false,
            },
            select: { id: true, role: true },
          });
          await tx.invitation.update({
            where: { id: invite.id },
            data: {
              status: "accepted",
              acceptedAt: new Date(),
              acceptedUserId: created.id,
            },
          });
          return created;
        })
      );
    } catch (e) {
      // Unique email violation: account already exists.
      if ((e as { code?: string }).code === "P2002") {
        return NextResponse.json(
          { error: "An account with that email already exists." },
          { status: 409 }
        );
      }
      throw e;
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set({
      name: SESSION_COOKIE,
      value: signSession({ sub: user.id, role: user.role as AppRole }),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return res;
  } catch (e) {
    console.error("portal accept error:", e);
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
