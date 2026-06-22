import { prisma } from "@/lib/db";
import {
  Card,
  PageHeading,
  StatCard,
  ComingSoon,
  EmptyRow,
  RoleBadge,
  EVALUATION_CRITERIA,
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
        title="Developer console"
        subtitle={`Signed in as ${user.name}. You can see and provision every account.`}
        action={
          <CreateUserForm
            mode="developer"
            managers={managers.map((m) => ({ id: m.id, name: m.name }))}
          />
        }
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Managers" value={managers.length} hint="Client accounts" />
        <StatCard
          label="Professionals"
          value={professionals.length}
          hint="Interpreters being evaluated"
        />
        <StatCard
          label="Evaluations in progress"
          value="—"
          hint="Placeholder — workflow not built yet"
        />
      </div>

      {/* Managers */}
      <Card className="mb-6 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Managers</h2>
        </div>
        {managers.length === 0 ? (
          <EmptyRow>No managers yet. Use “Add account” to create one.</EmptyRow>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Email</th>
                <th className="px-5 py-2 font-medium">Professionals</th>
                <th className="px-5 py-2 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {managers.map((m) => (
                <tr key={m.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-gray-900">{m.name}</td>
                  <td className="px-5 py-3 text-gray-500">{m.email}</td>
                  <td className="px-5 py-3 text-gray-700">
                    {m._count.professionals}
                  </td>
                  <td className="px-5 py-3 text-gray-400">{fmtDate(m.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Professionals */}
      <Card className="mb-8 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Professionals</h2>
        </div>
        {professionals.length === 0 ? (
          <EmptyRow>No professionals yet.</EmptyRow>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-400">
                <th className="px-5 py-2 font-medium">Name</th>
                <th className="px-5 py-2 font-medium">Email</th>
                <th className="px-5 py-2 font-medium">Manager</th>
                <th className="px-5 py-2 font-medium">Added</th>
              </tr>
            </thead>
            <tbody>
              {professionals.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-5 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-5 py-3 text-gray-500">{p.email}</td>
                  <td className="px-5 py-3 text-gray-700">
                    {p.manager?.name ?? (
                      <span className="text-gray-400">Unassigned</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-400">{fmtDate(p.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Placeholders for the evaluation workflow */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ComingSoon
          title="Phase 0 — alignment with managers"
          description="Capture each manager's expectations of the professionals they hire, and map those expectations to how we evaluate."
        />
        <ComingSoon
          title="Evaluation pipeline"
          description="Score professionals across the criteria below; track status from intake through final review."
        >
          <ul className="mt-3 grid gap-1.5 text-sm text-gray-500">
            {EVALUATION_CRITERIA.map((c) => (
              <li key={c.key} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                {c.label}
              </li>
            ))}
          </ul>
        </ComingSoon>
      </div>
    </div>
  );
}
