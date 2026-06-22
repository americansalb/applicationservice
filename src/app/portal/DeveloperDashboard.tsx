import { Building2, Users, ClipboardCheck, Workflow } from "lucide-react";
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
  EVALUATION_CRITERIA,
  thClass,
  tdClass,
} from "./ui";
import CreateUserForm from "./CreateUserForm";
import type { SessionUser } from "@/lib/appSession";

function fmtDate(d: Date) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const SUBTITLE = "Manage partner organizations, their professionals, and evaluations.";

export default async function DeveloperDashboard({
  user,
}: {
  user: SessionUser;
}) {
  function loadOverview() {
    return Promise.all([
      prisma.appUser.findMany({
        where: { role: "MANAGER" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          _count: { select: { professionals: true } },
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
          manager: { select: { id: true, name: true } },
        },
      }),
    ]);
  }

  let data: Awaited<ReturnType<typeof loadOverview>> | null = null;
  try {
    data = await withDbRetry("portal.dev.overview", loadOverview);
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

  const [managers, professionals] = data;

  return (
    <div>
      <PageHeading
        title="Overview"
        subtitle={`Signed in as ${user.name}. ${SUBTITLE}`}
        action={
          <CreateUserForm
            mode="developer"
            managers={managers.map((m) => ({ id: m.id, name: m.name }))}
          />
        }
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Building2 className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          label="Managers"
          value={managers.length}
          hint="Partner contacts"
        />
        <StatCard
          icon={<Users className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          label="Professionals"
          value={professionals.length}
          hint="Under evaluation"
        />
        <StatCard
          icon={<ClipboardCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          label="Evaluations"
          value={0}
          hint="None in progress yet"
        />
      </div>

      <section className="mb-8">
        <Card className="overflow-hidden">
          <CardHeader title="Managers" hint="Partner organization contacts" />
          {managers.length === 0 ? (
            <EmptyState icon={<Building2 className="h-5 w-5" strokeWidth={1.75} />}>
              No managers yet. Use “Add account” to create one.
            </EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200/70">
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Professionals</th>
                  <th className={thClass}>Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {managers.map((m) => (
                  <tr key={m.id} className="transition hover:bg-sand-50/70">
                    <td className={tdClass}>
                      <div className="flex items-center gap-3">
                        <Avatar name={m.name} tone="clay" />
                        <span className="font-medium text-ink">{m.name}</span>
                      </div>
                    </td>
                    <td className={`${tdClass} text-ink-soft`}>{m.email}</td>
                    <td className={`${tdClass} text-ink-soft`}>
                      {m._count.professionals}
                    </td>
                    <td className={`${tdClass} text-ink-faint`}>
                      {fmtDate(m.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </section>

      <section className="mb-10">
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
                  <th className={thClass}>Manager</th>
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
                      {p.manager?.name ?? (
                        <span className="text-ink-faint">Unassigned</span>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Planned
          icon={<Workflow className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          title="Phase 0 alignment"
          description="Capture each manager's expectations for their professionals, then map those expectations to the evaluation areas."
        />
        <Planned
          icon={<ClipboardCheck className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          title="Evaluation pipeline"
          description="Score professionals across each area and track status from intake to final review."
        >
          <ul className="mt-4 grid gap-1.5">
            {EVALUATION_CRITERIA.map((c) => (
              <li
                key={c.key}
                className="flex items-center gap-2.5 text-sm text-ink-soft"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-clay-500" />
                {c.label}
              </li>
            ))}
          </ul>
        </Planned>
      </div>
    </div>
  );
}
