import { Users, ListChecks, Workflow } from "lucide-react";
import { prisma } from "@/lib/db";
import {
  Card,
  CardHeader,
  PageHeading,
  StatCard,
  Avatar,
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
        subtitle={`Welcome, ${firstName}. Track the professionals on your account and their evaluation status.`}
        action={<CreateUserForm mode="manager" />}
      />

      <div className="mb-10 grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Users className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          label="Professionals"
          value={team.length}
          hint="On your account"
        />
        <StatCard
          icon={<ListChecks className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          label="Action items"
          value={0}
          hint="None outstanding"
        />
        <StatCard
          icon={<Workflow className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          label="Phase 0"
          value="Pending"
          hint="Expectations not captured"
        />
      </div>

      <section className="mb-10">
        <Card className="overflow-hidden">
          <CardHeader title="Roster" hint="Professionals on your account" />
          {team.length === 0 ? (
            <EmptyState>
              No professionals yet. Use “Add professional” to invite one.
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Planned
          icon={<Workflow className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          title="Phase 0 expectations"
          description="Define the competencies and expectations for your professionals so evaluations reflect your organization's standards."
        />
        <Planned
          icon={<ListChecks className="h-[18px] w-[18px]" strokeWidth={1.75} />}
          title="Action items"
          description="Tasks for you and your professionals will appear here as evaluations begin."
        />
      </div>
    </div>
  );
}
