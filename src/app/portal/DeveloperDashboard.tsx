import { Building2, Users, Mail } from "lucide-react";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import {
  Card,
  CardHeader,
  PageHeading,
  StatCard,
  Avatar,
  RoleBadge,
  StatusTag,
  EmptyState,
  LoadError,
  thClass,
  tdClass,
} from "./ui";
import InviteForm from "./InviteForm";
import type { SessionUser } from "@/lib/appSession";
import type { AppRole } from "@/lib/appAuth";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const SUBTITLE = "Manage organizations, their people, and invitations.";

export default async function DeveloperDashboard({
  user,
}: {
  user: SessionUser;
}) {
  function load() {
    return Promise.all([
      prisma.organization.findMany({
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
      }),
      prisma.appUser.findMany({
        where: { role: "MANAGER" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          organization: { select: { name: true } },
        },
      }),
      prisma.appUser.findMany({
        where: { role: "PROFESSIONAL" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          organization: { select: { name: true } },
        },
      }),
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

  const [orgs, managers, professionals, invites] = data;

  return (
    <div>
      <PageHeading
        title="Overview"
        subtitle={`Signed in as ${user.name}. ${SUBTITLE}`}
        action={
          <InviteForm
            mode="developer"
            organizations={orgs.map((o) => ({ id: o.id, name: o.name }))}
          />
        }
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Building2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          label="Organizations"
          value={orgs.length}
        />
        <StatCard
          icon={<Users className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          label="Managers"
          value={managers.length}
        />
        <StatCard
          icon={<Users className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          label="Professionals"
          value={professionals.length}
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
                  <th className={thClass}>Organization</th>
                  <th className={thClass}>Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {invites.map((i) => (
                  <tr key={i.id}>
                    <td className={`${tdClass} font-medium text-ink`}>{i.email}</td>
                    <td className={tdClass}>
                      <RoleBadge role={i.role as AppRole} />
                    </td>
                    <td className={`${tdClass} text-ink-soft`}>
                      {i.organization.name}
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
          <CardHeader title="Organizations" hint="Client institutions" />
          {orgs.length === 0 ? (
            <EmptyState icon={<Building2 className="h-5 w-5" strokeWidth={1.75} />}>
              No organizations yet. Use “Invite people” to create one.
            </EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200/70">
                  <th className={thClass}>Name</th>
                  <th className={thClass}>People</th>
                  <th className={thClass}>Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {orgs.map((o) => (
                  <tr key={o.id} className="transition hover:bg-sand-50/70">
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <Avatar name={o.name} tone="clay" />
                        <span className="font-medium text-ink">{o.name}</span>
                      </div>
                    </td>
                    <td className={`${tdClass} text-ink-soft`}>
                      {o._count.members}
                    </td>
                    <td className={`${tdClass} text-ink-faint`}>
                      {fmtDate(o.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      <section className="mb-8">
        <Card className="overflow-hidden">
          <CardHeader title="Professionals" hint="Interpreters under evaluation" />
          {professionals.length === 0 ? (
            <EmptyState icon={<Users className="h-5 w-5" strokeWidth={1.75} />}>
              No professionals yet.
            </EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200/70">
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Organization</th>
                  <th className={thClass}>Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {professionals.map((p) => (
                  <tr key={p.id} className="transition hover:bg-sand-50/70">
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <Avatar name={p.name} />
                        <span className="font-medium text-ink">{p.name}</span>
                      </div>
                    </td>
                    <td className={`${tdClass} text-ink-soft`}>{p.email}</td>
                    <td className={`${tdClass} text-ink-soft`}>
                      {p.organization?.name ?? (
                        <span className="text-ink-faint">None</span>
                      )}
                    </td>
                    <td className={`${tdClass} text-ink-faint`}>
                      {fmtDate(p.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>
    </div>
  );
}
