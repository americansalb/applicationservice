import { prisma } from "@/lib/db";
import {
  Card,
  PageHeading,
  Figures,
  Planned,
  EmptyState,
  StatusTag,
  CriteriaDots,
} from "./ui";
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

  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <div>
      <PageHeading
        title="Your professionals"
        subtitle={`Welcome, ${firstName}. Track the professionals under your account and where each stands in the evaluation.`}
        action={<CreateUserForm mode="manager" />}
      />

      <div className="mb-10">
        <Figures
          items={[
            { label: "Professionals", value: team.length, hint: "Under your account" },
            { label: "Action items", value: "—", hint: "None outstanding" },
            { label: "Phase 0", value: "Pending", hint: "Expectations not captured" },
          ]}
        />
      </div>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl font-medium text-ink">Roster</h2>
        <Card className="overflow-hidden">
          {team.length === 0 ? (
            <EmptyState>
              No professionals yet — use “Add professional” to invite one.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-sand-100">
              {team.map((p) => (
                <li
                  key={p.id}
                  className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4"
                >
                  <div className="min-w-[12rem] flex-1">
                    <p className="font-medium text-ink">{p.name}</p>
                    <p className="text-sm text-ink-soft">{p.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <CriteriaDots done={0} />
                    <span className="text-xs text-ink-faint">0 of 5 areas</span>
                  </div>
                  <StatusTag tone="pending">Phase 0 — awaiting input</StatusTag>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <Planned
          title="Phase 0: your expectations"
          description="We'll work with you to define what “qualified” means for the professionals you hire, then align those expectations with how they're evaluated."
        />
        <Planned
          title="Action items"
          description="Tasks for you and your professionals will appear here as evaluations get underway."
        />
      </div>
    </div>
  );
}
