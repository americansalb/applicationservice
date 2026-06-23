import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withDbRetry, isConnectivityError } from "@/lib/dbRetry";
import { userFromToken } from "@/lib/appSession";
import { SESSION_COOKIE } from "@/lib/appAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { clientIp, isSameOrigin, baseUrl } from "@/lib/appRequest";
import { sendEmail } from "@/lib/email";
import {
  newInviteToken,
  inviteExpiry,
  inviteUrl,
  isEmailConfigured,
  inviteEmailHtml,
  inviteEmailText,
} from "@/lib/invitations";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_LABELS: Record<string, string> = {
  MANAGER: "Manager",
  PROFESSIONAL: "Professional",
};

function serviceError(e: unknown) {
  console.error("portal invitations error:", e);
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

// GET: pending invitations visible to the caller.
export async function GET(req: NextRequest) {
  try {
    const session = await userFromToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }

    const where =
      session.role === "DEVELOPER"
        ? { status: "pending" as const }
        : session.role === "MANAGER" && session.organizationId
          ? { status: "pending" as const, organizationId: session.organizationId }
          : null;

    if (!where) return NextResponse.json({ invitations: [] });

    const invitations = await withDbRetry("portal.invites.list", () =>
      prisma.invitation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          expiresAt: true,
          organization: { select: { name: true } },
        },
      })
    );
    return NextResponse.json({ invitations });
  } catch (e) {
    return serviceError(e);
  }
}

// POST: create (or re-issue) an invitation.
export async function POST(req: NextRequest) {
  try {
    if (!isSameOrigin(req)) {
      return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
    }

    const session = await userFromToken(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    }
    if (session.role !== "DEVELOPER" && session.role !== "MANAGER") {
      return NextResponse.json(
        { error: "You do not have permission to invite people." },
        { status: 403 }
      );
    }

    const rl = checkRateLimit(`portal-invite:${clientIp(req)}`);
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
    const email =
      typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const role = body?.role;
    const organizationId =
      typeof body?.organizationId === "string" && body.organizationId
        ? body.organizationId
        : null;
    const organizationName =
      typeof body?.organizationName === "string" ? body.organizationName.trim() : "";

    if (!email || !EMAIL_RE.test(email) || email.length > 320) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }
    if (role !== "MANAGER" && role !== "PROFESSIONAL") {
      return NextResponse.json(
        { error: "Choose a role: Manager or Professional." },
        { status: 400 }
      );
    }

    // Resolve the target organization.
    let orgId: string;
    let orgName: string;
    if (session.role === "MANAGER") {
      if (!session.organizationId) {
        return NextResponse.json(
          { error: "Your account is not linked to an organization yet." },
          { status: 400 }
        );
      }
      orgId = session.organizationId;
      const org = await withDbRetry("portal.invite.org", () =>
        prisma.organization.findUnique({
          where: { id: orgId },
          select: { name: true },
        })
      );
      orgName = org?.name ?? "your organization";
    } else {
      // DEVELOPER: existing org by id, or create one by name.
      if (organizationId) {
        const org = await withDbRetry("portal.invite.org", () =>
          prisma.organization.findUnique({
            where: { id: organizationId },
            select: { id: true, name: true },
          })
        );
        if (!org) {
          return NextResponse.json(
            { error: "Selected organization was not found." },
            { status: 400 }
          );
        }
        orgId = org.id;
        orgName = org.name;
      } else if (organizationName) {
        const created = await withDbRetry("portal.invite.org.create", () =>
          prisma.organization.create({
            data: { name: organizationName, createdById: session.id },
            select: { id: true, name: true },
          })
        );
        orgId = created.id;
        orgName = created.name;
      } else {
        return NextResponse.json(
          { error: "Choose or name an organization." },
          { status: 400 }
        );
      }
    }

    // Don't invite someone who already has an account.
    const existing = await withDbRetry("portal.invite.exists", () =>
      prisma.appUser.findUnique({ where: { email }, select: { id: true } })
    );
    if (existing) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const token = newInviteToken();
    const expiresAt = inviteExpiry();

    // Reissue: supersede any prior pending invite for this email.
    await withDbRetry("portal.invite.supersede", () =>
      prisma.invitation.updateMany({
        where: { email, status: "pending" },
        data: { status: "revoked" },
      })
    );
    await withDbRetry("portal.invite.create", () =>
      prisma.invitation.create({
        data: {
          token,
          email,
          name: name || null,
          role,
          organizationId: orgId,
          invitedById: session.id,
          expiresAt,
        },
      })
    );

    const url = inviteUrl(baseUrl(req), token);

    let emailed = false;
    if (isEmailConfigured()) {
      const emailArgs = {
        orgName,
        roleLabel: ROLE_LABELS[role],
        url,
        inviterName: session.name,
      };
      try {
        await sendEmail(
          email,
          `You're invited to ${orgName} on the AALB Evaluation Platform`,
          inviteEmailHtml(emailArgs),
          { text: inviteEmailText(emailArgs) }
        );
        emailed = true;
      } catch (e) {
        console.error("invite email failed:", e);
      }
    }

    return NextResponse.json(
      { invitation: { email, role, organizationName: orgName }, url, emailed },
      { status: 201 }
    );
  } catch (e) {
    return serviceError(e);
  }
}
