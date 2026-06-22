import { ListChecks } from "lucide-react";
import {
  Card,
  CardHeader,
  PageHeading,
  Planned,
  StatusTag,
  EVALUATION_CRITERIA,
} from "./ui";
import type { SessionUser } from "@/lib/appSession";

export default async function ProfessionalDashboard({
  user,
}: {
  user: SessionUser;
}) {
  const firstName = user.name.split(" ")[0] || user.name;

  return (
    <div>
      <PageHeading
        title={`Welcome, ${firstName}`}
        subtitle="Your evaluation is organized into the areas below. Each opens as your evaluation progresses."
      />

      <section className="mb-8">
        <Card className="overflow-hidden">
          <CardHeader
            title="Areas of evaluation"
            hint="The criteria your interpreting work is assessed against"
          />
          <ol className="divide-y divide-sand-100">
            {EVALUATION_CRITERIA.map((c, i) => (
              <li
                key={c.key}
                className="flex items-start gap-5 px-6 py-5 transition hover:bg-sand-50/70"
              >
                <span className="mt-0.5 font-display text-lg font-medium tabular-nums text-clay-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-ink">{c.label}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-soft">
                    {c.desc}
                  </p>
                </div>
                <StatusTag tone="neutral">Not started</StatusTag>
              </li>
            ))}
          </ol>
        </Card>
      </section>

      <Planned
        icon={<ListChecks className="h-[18px] w-[18px]" strokeWidth={1.75} />}
        title="Action items"
        description="Tasks such as scheduling sessions, uploading credentials, and completing assessments will appear here as your evaluation begins."
      />
    </div>
  );
}
