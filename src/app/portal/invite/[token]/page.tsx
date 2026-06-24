import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { LogoImage } from "../../Brand";
import AcceptForm from "./AcceptForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Accept invitation",
  robots: { index: false, follow: false },
};

const ROLE_LABELS: Record<string, string> = {
  DEVELOPER: "Developer",
  MANAGER: "Manager",
  PROFESSIONAL: "Professional",
};

export default async function InvitePage({
  params,
}: {
  params: { token: string };
}) {
  let invite: {
    email: string;
    name: string | null;
    role: string;
    status: string;
    expiresAt: Date;
    organization: { name: string } | null;
  } | null = null;
  try {
    invite = await prisma.invitation.findUnique({
      where: { token: params.token },
      select: {
        email: true,
        name: true,
        role: true,
        status: true,
        expiresAt: true,
        organization: { select: { name: true } },
      },
    });
  } catch {
    invite = null;
  }

  const valid =
    !!invite &&
    invite.status === "pending" &&
    invite.expiresAt.getTime() >= Date.now();

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100/60 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <LogoImage tone="dark" className="h-12" />
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-raised sm:p-10">
          {valid && invite ? (
            <AcceptForm
              token={params.token}
              email={invite.email}
              name={invite.name ?? ""}
              orgName={invite.organization?.name}
              roleLabel={ROLE_LABELS[invite.role] ?? invite.role}
            />
          ) : (
            <div className="text-center">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Invitation unavailable
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                This invitation link is invalid, has already been used, or has
                expired. Please ask your administrator for a new one.
              </p>
              <a
                href="/portal/login"
                className="mt-6 inline-flex rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-950"
              >
                Go to sign in
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
