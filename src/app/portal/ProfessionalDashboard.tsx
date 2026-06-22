import { Card, PageHeading, Planned, StatusTag, EVALUATION_CRITERIA } from "./ui";
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
        subtitle="Your evaluation as an interpreter is organised around the areas below. Each will open as your evaluation begins."
      />

      <section className="mb-8">
        <h2 className="mb-3 font-display text-xl font-medium text-ink">
          Areas of evaluation
        </h2>
        <Card className="overflow-hidden">
          <ol className="divide-y divide-sand-100">
            {EVALUATION_CRITERIA.map((c, i) => (
              <li key={c.key} className="flex items-start gap-5 px-6 py-5">
                <span className="mt-0.5 font-display text-lg font-medium tabular-nums text-clay-600">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <p className="font-display text-lg font-medium text-ink">
                    {c.label}
                  </p>
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
        title="Action items"
        description="Tasks for you — scheduling sessions, uploading credentials, completing assessments — will appear here as your evaluation begins."
      />
    </div>
  );
}
