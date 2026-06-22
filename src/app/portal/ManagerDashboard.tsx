import { Users, UserCog, Mail, Workflow } from "lucide-react";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import {
  Card,
  CardHeader,
  PageHeading,
  StatCard,
  Avatar,
  Planned,
  EmptyState,
  LoadError,
  StatusTag,
  CriteriaDots,
  thClass,
  tdClass,
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

export default async function ManagerDashboard({
  user,
}: {
  user: SessionUser;
}) {
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
        select: { name: true },
      }),
      prisma.appUser.findMany({
        where: { organizationId: orgId, role: "PROFESSIONAL" },
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, email: true, createdAt: true },
      }),
      prisma.appUser.findMany({
        where: { organizationId: orgId, role: "MANAGER" },
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

  const [org, team, managers, invites] = data;
  const orgName = org?.name ?? "your organization";

  return (
    <div>
      <PageHeading
        title="Your team"
        subtitle={`Welcome, ${firstName}. Managing ${orgName}.`}
        action={<InviteForm mode="manager" />}
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Users className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          label="Professionals"
          value={team.length}
        />
        <StatCard
          icon={<UserCog className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          label="Managers"
          value={managers.length}
        />
        <StatCard
          icon={<Mail className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          label="Pending invites"
          value={invites.length}
        />
      </div>

      {invites.length > 0 && (
        <section className="mb-8">
          <Card className="overflow-hidden">
            <CardHeader title="Pending invitations" hint="Not yet accepted" />
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200/70">
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Role</th>
                  <th className={thClass}>Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {invites.map((i) => (
                  <tr key={i.id}>
                    <td className={`${tdClass} font-medium text-ink`}>{i.email}</td>
                    <td className={`${tdClass} text-ink-soft`}>
                      {i.role === "MANAGER" ? "Manager" : "Professional"}
                    </td>
                    <td className={`${tdClass} text-ink-faint`}>
                      {fmtDate(i.expiresAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </section>
      )}

      <section className="mb-8">
        <Card className="overflow-hidden">
          <CardHeader title="Professionals" hint="On your account" />
          {team.length === 0 ? (
            <EmptyState icon={<Users className="h-5 w-5" strokeWidth={1.75} />}>
              No professionals yet. Use “Invite people” to add one.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-sand-100">
              {team.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4 transition hover:bg-sand-50/70"
                >
                  <div className="flex min-w-[14rem] flex-1 items-center gap-3">
                    <Avatar name={p.name} />
                    <div className="min-w-0">
                      <p className="font-medium text-ink">{p.name}</p>
                      <p className="truncate text-sm text-ink-soft">{p.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CriteriaDots done={0} />
                    <span className="text-xs text-ink-faint">0 of 5 areas</span>
                  </div>
                  <StatusTag tone="pending">Awaiting Phase 0</StatusTag>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="mb-8">
        <Card className="overflow-hidden">
          <CardHeader title="Managers" hint="Colleagues on this account" />
          <ul className="divide-y divide-sand-100">
            {managers.map((m) => (
              <li key={m.id} className="flex items-center gap-3 px-6 py-3.5">
                <Avatar name={m.name} tone="clay" />
                <div className="min-w-0">
                  <p className="font-medium text-ink">
                    {m.name}
                    {m.id === user.id && (
                      <span className="ml-2 text-xs font-normal text-ink-faint">
                        (you)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-ink-soft">{m.email}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <Planned
        icon={<Workflow className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        title="Phase 0 expectations"
        description="Define the competencies and expectations for your professionals so evaluations reflect your organization's standards."
      />
    </div>
  );
}
