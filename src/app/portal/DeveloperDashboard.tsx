import { Building2, Mail } from "lucide-react";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import {
  Card,
  PageHeading,
  Avatar,
  RoleBadge,
  EmptyState,
  LoadError,
} from "./ui";
import InviteForm from "./InviteForm";
import StandardsToggle from "./StandardsToggle";
import type { SessionUser } from "@/lib/appSession";
import type { AppRole } from "@/lib/appAuth";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const SUBTITLE =
  "Manage client institutions, their people, and candidates moving through the qualification assessment.";

export default async function DeveloperDashboard({ user }: { user: SessionUser }) {
  function load() {
    return Promise.all([
      prisma.organization.findMany({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, createdAt: true, standardsAlignedAt: true },
      }),
      prisma.appUser.findMany({
        where: { role: "PROFESSIONAL" },
        select: { organizationId: true },
      }),
      prisma.appUser.count({ where: { role: "MANAGER" } }),
      prisma.invitation.findMany({
        where: { status: "pending" },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          role: true,
          expiresAt: true,
          organization: { select: { name: true } },
        },
      }),
    ]);
  }

  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await withDbRetry("portal.dev.overview", load);
  } catch (e) {
    console.error("[portal] developer overview load failed:", e);
  }

  if (!data) {
    return (
      <div>
        <PageHeading title="Overview" subtitle={SUBTITLE} />
        <LoadError label="the overview" />
      </div>
    );
  }

  const [orgs, professionals, managerCount, invites] = data;
  const candidates = professionals.length;
  const byOrg = new Map<string, number>();
  for (const p of professionals) {
    if (p.organizationId)
      byOrg.set(p.organizationId, (byOrg.get(p.organizationId) ?? 0) + 1);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            AALB operations
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-ink">
            Overview
          </h1>
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            Signed in as {user.name.split(" ")[0] || user.name}. {SUBTITLE}
          </p>
        </div>
        <InviteForm
          mode="developer"
          organizations={orgs.map((o) => ({ id: o.id, name: o.name }))}
        />
      </div>

      {/* Inline summary — figures, not boxes */}
      <div className="mb-8 flex flex-wrap items-end gap-x-10 gap-y-4 border-b border-sand-200/70 pb-6">
        <Figure value={orgs.length} label="Institutions" />
        <Figure value={candidates} label="Interpreters" />
        <Figure value={0} label="Verified" />
        <Figure value={managerCount} label="Managers" />
      </div>

      {/* Institutions */}
      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between">
          <h3 className="font-display text-base font-medium text-ink">
            Client institutions
          </h3>
          <span className="text-xs text-ink-faint">
            Phase 0 sets each institution&rsquo;s standards
          </span>
        </div>
        {orgs.length === 0 ? (
          <Card className="overflow-hidden">
            <EmptyState icon={<Building2 className="h-5 w-5" strokeWidth={1.75} />}>
              No institutions yet. Use “Invite people” to create one.
            </EmptyState>
          </Card>
        ) : (
          <div className="space-y-3">
            {orgs.map((o) => {
              const count = byOrg.get(o.id) ?? 0;
              return (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-sand-200/80 bg-white px-5 py-4 shadow-card"
                >
                  <Avatar name={o.name} tone="clay" />
                  <div className="min-w-[12rem] flex-1">
                    <p className="font-medium text-ink">{o.name}</p>
                    <p className="text-sm text-ink-soft">
                      {count} {count === 1 ? "interpreter" : "interpreters"} · added{" "}
                      {fmtDate(o.createdAt)}
                    </p>
                  </div>
                  <StandardsToggle orgId={o.id} aligned={!!o.standardsAlignedAt} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Pending invitations */}
      {invites.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h3 className="font-display text-base font-medium text-ink">
              Pending invitations
            </h3>
            <span className="text-xs text-ink-faint">Not yet accepted</span>
          </div>
          <div className="space-y-2.5">
            {invites.map((i) => (
              <div
                key={i.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-dashed border-sand-300 bg-white/60 px-5 py-3.5 text-sm"
              >
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-sand-100 text-ink-faint">
                  <Mail className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-[12rem] flex-1 font-medium text-ink">
                  {i.email}
                </span>
                <RoleBadge role={i.role as AppRole} />
                <span className="text-ink-faint">
                  {i.organization?.name ?? "AALB"} · expires{" "}
                  {fmtDate(i.expiresAt)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Figure({ value, label }: { value: number; label: string }) {
  return (
    <div>
      <div className="font-display text-[32px] font-semibold leading-none text-ink">
        {value}
      </div>
      <div className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-ink-faint">
        {label}
      </div>
    </div>
  );
}
