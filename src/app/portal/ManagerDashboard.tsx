import Link from "next/link";
import { ArrowRight, Mail, Users } from "lucide-react";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import {
  Card,
  PageHeading,
  Avatar,
  JourneyTrack,
  LockChip,
  EmptyState,
  LoadError,
} from "./ui";
import InviteForm from "./InviteForm";
import type { SessionUser } from "@/lib/appSession";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function ManagerDashboard({ user }: { user: SessionUser }) {
  const firstName = user.name.split(" ")[0] || user.name;

  if (!user.organizationId) {
    return (
      <div>
        <PageHeading title="Your team" subtitle={`Welcome, ${firstName}.`} />
        <Card className="p-6">
          <p className="text-sm text-ink-soft">
            Your account is not linked to an organization yet. Please contact
            AALB to finish setting up your account.
          </p>
        </Card>
      </div>
    );
  }

  const orgId = user.organizationId;

  function load() {
    return Promise.all([
      prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, standardsAlignedAt: true, phase0Status: true },
      }),
      prisma.appUser.findMany({
        where: { organizationId: orgId, role: "PROFESSIONAL" },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true },
      }),
      prisma.invitation.findMany({
        where: { organizationId: orgId, status: "pending" },
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, role: true, expiresAt: true },
      }),
    ]);
  }

  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await withDbRetry("portal.manager.team", load);
  } catch (e) {
    console.error("[portal] manager team load failed:", e);
  }

  if (!data) {
    return (
      <div>
        <PageHeading title="Your team" subtitle={`Welcome, ${firstName}.`} />
        <LoadError label="your team" />
      </div>
    );
  }

  const [org, team, invites] = data;
  const orgName = org?.name ?? "your organization";
  const aligned = org?.standardsAlignedAt ?? null;
  // standardsAlignedAt is the authoritative finalize/unlock signal. Until it is
  // set, phase0Status tells us whether the questionnaire is untouched, in
  // progress, or submitted and waiting on AALB.
  const submitted = !aligned && org?.phase0Status === "submitted";
  const started = org?.phase0Status === "in_progress";
  const validThrough = aligned
    ? new Date(new Date(aligned).setFullYear(new Date(aligned).getFullYear() + 2))
    : null;
  const avatars = team.map((p) => p.name);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            {orgName}
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-ink">
            Your team&rsquo;s journey to qualification
          </h1>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            {aligned
              ? `Welcome, ${firstName}. Here's where each interpreter stands on the path to their Verification of Qualification.`
              : submitted
                ? "Your standards are with AALB for review. We will let you know the moment your interpreters can begin."
                : "One foundational step stands between your interpreters and the start of their assessments."}
          </p>
        </div>
        <InviteForm mode="manager" />
      </div>

      {aligned ? (
        <>
          {/* Standards active — quiet status */}
          <div className="mb-6 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-teal-700/20 bg-teal-50/60 px-4 py-3 text-sm">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-teal-600 text-[11px] font-bold text-white">
              0
            </span>
            <span className="font-medium text-ink">Institutional standards active</span>
            <span className="text-ink-faint">
              · Phase 0 complete{validThrough ? ` · valid through ${fmtDate(validThrough)}` : ""}
            </span>
          </div>

          {/* Live team track */}
          <section className="relative mb-8 overflow-hidden rounded-3xl border border-sand-200/80 bg-white shadow-raised">
            <div className="relative flex items-center justify-between px-7 pt-6">
              <div>
                <h2 className="font-display text-base font-medium text-ink">
                  Where your team stands
                </h2>
                <p className="mt-0.5 text-xs text-ink-faint">
                  Each interpreter, positioned on the qualification track
                </p>
              </div>
              <div className="hidden items-center gap-4 text-xs sm:flex">
                <span className="text-ink-faint">
                  <span className="font-semibold text-ink">{team.length}</span> in progress
                </span>
                <span className="text-ink-faint">
                  <span className="font-semibold text-ink">0</span> verified
                </span>
              </div>
            </div>
            <JourneyTrack current={0} avatars={avatars} />
          </section>

          <Roster team={team} />
        </>
      ) : (
        <>
          {submitted ? (
            <section className="mb-7 overflow-hidden rounded-3xl border border-teal-700/20 bg-white shadow-card">
              <div className="flex flex-col items-start gap-4 p-7 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                    Phase 0 · Institutional foundation
                  </span>
                  <h2 className="mt-2 font-display text-2xl font-semibold leading-snug text-ink">
                    Standards submitted, under review
                  </h2>
                  <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-ink-soft">
                    Thank you. AALB is turning {orgName}&rsquo;s answers into the
                    standards profile your interpreters will be assessed against.
                    This usually takes a couple of business days.
                  </p>
                </div>
                <span className="inline-flex shrink-0 items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-700/15">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
                  With AALB
                </span>
              </div>
            </section>
          ) : (
          /* Phase 0 pending hero */
          <section className="mb-7 overflow-hidden rounded-3xl border border-teal-700/25 bg-white shadow-raised">
            <div className="grid md:grid-cols-[1.5fr_1fr]">
              <div className="p-7">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                    Phase 0 · Institutional foundation
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-clay-700 ring-1 ring-inset ring-clay-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-clay-500" /> Action needed
                  </span>
                </div>
                <h2 className="mt-3 font-display text-2xl font-semibold leading-snug text-ink">
                  Set {orgName}&rsquo;s assessment standards
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                  Before any interpreter begins, AALB works with your leadership to
                  define the rubrics every assessment is scored against, aligned to
                  your policies and federal language-access requirements.
                </p>
                <ul className="mt-4 space-y-2">
                  {[
                    "Custom, role-specific scoring rubrics",
                    "Federal & state regulatory alignment",
                    "Documented standards, valid two years",
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2.5 text-sm text-ink">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-teal-50 text-[11px] text-teal-700">
                        ✓
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap items-center gap-4">
                  <Link
                    href="/portal/phase0"
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950"
                  >
                    {started
                      ? "Continue standards alignment"
                      : "Begin standards alignment"}
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </Link>
                  <span className="text-xs text-ink-faint">
                    {started
                      ? "Pick up where you left off"
                      : "Saved as you go, do it in stages"}
                  </span>
                </div>
              </div>
              <div className="relative hidden overflow-hidden bg-teal-950 md:block">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.5]"
                  style={{
                    backgroundImage:
                      "radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px)",
                    backgroundSize: "20px 20px",
                  }}
                />
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(90% 70% at 80% 10%, rgba(45,212,191,0.18), transparent 55%)",
                  }}
                />
                <div className="relative flex h-full flex-col items-center justify-center p-6 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-white/5 ring-1 ring-inset ring-white/10">
                    <span className="font-display text-5xl font-semibold text-teal-200">0</span>
                  </div>
                  <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-300/80">
                    The foundation
                  </p>
                  <p className="mt-1 text-sm leading-snug text-teal-100/70">
                    Everything is scored
                    <br />
                    against these standards
                  </p>
                </div>
              </div>
            </div>
          </section>
          )}

          {/* Team waiting — locked track */}
          <section className="relative mb-8 overflow-hidden rounded-3xl border border-sand-200/80 bg-white shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-2 px-7 pt-5">
              <div>
                <h2 className="font-display text-base font-medium text-ink-soft">
                  {team.length > 0
                    ? "Your team is ready to begin"
                    : "Invite your interpreters"}
                </h2>
                <p className="mt-0.5 text-xs text-ink-faint">
                  Step 1 unlocks for everyone the moment standards are set
                </p>
              </div>
              <LockChip>Locked</LockChip>
            </div>
            {team.length > 0 ? (
              <JourneyTrack current={0} avatars={avatars} dim />
            ) : (
              <EmptyState icon={<Users className="h-5 w-5" strokeWidth={1.75} />}>
                No interpreters yet. Use “Invite people” to add your first.
              </EmptyState>
            )}
          </section>
        </>
      )}

      <PendingInvites invites={invites} />
    </div>
  );

  function Roster({
    team,
  }: {
    team: { id: string; name: string; email: string }[];
  }) {
    if (team.length === 0) {
      return (
        <section className="mb-8">
          <Card className="overflow-hidden">
            <EmptyState icon={<Users className="h-5 w-5" strokeWidth={1.75} />}>
              No interpreters yet. Use “Invite people” to add your first.
            </EmptyState>
          </Card>
        </section>
      );
    }
    return (
      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-display text-base font-medium text-ink">
            Your interpreters
          </h3>
          <span className="text-xs text-ink-faint">{team.length} people</span>
        </div>
        <div className="space-y-3">
          {team.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-sand-200/80 bg-white px-5 py-4 shadow-card"
            >
              <Avatar name={p.name} />
              <div className="min-w-[12rem] flex-1">
                <p className="font-medium text-ink">{p.name}</p>
                <p className="truncate text-sm text-ink-soft">{p.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-clay-500" />
                <span className="text-sm text-ink-soft">
                  Awaiting Step 1 · Credentials
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }
}

function PendingInvites({
  invites,
}: {
  invites: { id: string; email: string; role: string; expiresAt: Date }[];
}) {
  if (invites.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {invites.map((i) => (
        <div
          key={i.id}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-sand-300 bg-white/60 px-5 py-3.5 text-sm"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sand-100 text-ink-faint">
            <Mail className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span className="flex-1 text-ink-soft">
            <span className="font-medium text-ink">{i.email}</span>, invitation
            sent, awaiting acceptance · expires{" "}
            {new Date(i.expiresAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
