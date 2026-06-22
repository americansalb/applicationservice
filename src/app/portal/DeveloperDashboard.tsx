import { prisma } from "@/lib/db";
import {
  Card,
  PageHeading,
  Figures,
  Planned,
  EmptyState,
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

export default async function DeveloperDashboard({
  user,
}: {
  user: SessionUser;
}) {
  const [managers, professionals] = await Promise.all([
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

  return (
    <div>
      <PageHeading
        title="Overview"
        subtitle={`Signed in as ${user.name}. You can see and provision every account on the platform.`}
        action={
          <CreateUserForm
            mode="developer"
            managers={managers.map((m) => ({ id: m.id, name: m.name }))}
          />
        }
      />

      <div className="mb-10">
        <Figures
          items={[
            { label: "Managers", value: managers.length, hint: "Partner contacts" },
            {
              label: "Professionals",
              value: professionals.length,
              hint: "Under evaluation",
            },
            {
              label: "Evaluations",
              value: "—",
              hint: "Workflow not built yet",
            },
          ]}
        />
      </div>

      {/* Managers register */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl font-medium text-ink">Managers</h2>
        <Card className="overflow-hidden">
          {managers.length === 0 ? (
            <EmptyState>No managers yet — use “Add account” to create one.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200">
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Professionals</th>
                  <th className={thClass}>Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {managers.map((m) => (
                  <tr key={m.id}>
                    <td className={`${tdClass} font-medium text-ink`}>{m.name}</td>
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

      {/* Professionals register */}
      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl font-medium text-ink">
          Professionals
        </h2>
        <Card className="overflow-hidden">
          {professionals.length === 0 ? (
            <EmptyState>No professionals yet.</EmptyState>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-sand-200">
                  <th className={thClass}>Name</th>
                  <th className={thClass}>Email</th>
                  <th className={thClass}>Manager</th>
                  <th className={thClass}>Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {professionals.map((p) => (
                  <tr key={p.id}>
                    <td className={`${tdClass} font-medium text-ink`}>{p.name}</td>
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

      <div className="grid gap-5 lg:grid-cols-2">
        <Planned
          title="Phase 0 — alignment with managers"
          description="Sit down with each manager to capture what they expect from the professionals they hire, then map those expectations to how we evaluate."
        />
        <Planned title="Evaluation pipeline" description="Score professionals across each area and track status from intake through final review.">
          <ul className="mt-4 space-y-1.5">
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
