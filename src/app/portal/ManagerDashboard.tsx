import { prisma } from "@/lib/db";
import { Card, PageHeading, ComingSoon, EmptyRow, StatCard } from "./ui";
import CreateUserForm from "./CreateUserForm";
import type { SessionUser } from "@/lib/appSession";

export default async function ManagerDashboard({
  user,
}: {
  user: SessionUser;
}) {
  const team = await prisma.appUser.findMany({
    where: { managerId: user.id, role: "PROFESSIONAL" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  return (
    <div>
      <PageHeading
        title="Your professionals"
        subtitle={`Welcome, ${user.name}. Track the professionals under your account and their evaluation progress.`}
        action={<CreateUserForm mode="manager" />}
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Professionals" value={team.length} hint="Under your account" />
        <StatCard label="Action items" value="—" hint="Placeholder" />
        <StatCard label="Phase 0" value="Pending" hint="Expectations not yet captured" />
      </div>

      <Card className="mb-8 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Professionals &amp; progress
          </h2>
        </div>
        {team.length === 0 ? (
          <EmptyRow>
            No professionals yet. Use “Add professional” to invite one.
          </EmptyRow>
        ) : (
          <ul className="divide-y divide-gray-50">
            {team.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-4 px-5 py-4"
              >
                <div className="min-w-[12rem] flex-1">
                  <p className="font-medium text-gray-900">{p.name}</p>
                  <p className="text-sm text-gray-500">{p.email}</p>
                </div>
                {/* Placeholder progress — real evaluation status comes later. */}
                <div className="w-48">
                  <div className="mb-1 flex items-center justify-between text-xs text-gray-400">
                    <span>Evaluation progress</span>
                    <span>0%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-gray-100">
                    <div className="h-1.5 w-0 rounded-full bg-teal-500" />
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-600/20">
                  Phase 0 — pending
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ComingSoon
          title="Phase 0: your expectations"
          description="We'll work with you to capture what you expect from the professionals you hire, then align those expectations with how they're evaluated."
        />
        <ComingSoon
          title="Action items"
          description="Outstanding tasks for you and your professionals will appear here as evaluations progress."
        />
      </div>
    </div>
  );
}
