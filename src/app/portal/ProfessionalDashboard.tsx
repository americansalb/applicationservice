import { Card, PageHeading, ComingSoon, EVALUATION_CRITERIA } from "./ui";
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
        subtitle="Your evaluation as an interpreter will be tracked here across each area."
      />

      <Card className="mb-6 overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">
            Your evaluation
          </h2>
        </div>
        <ul className="divide-y divide-gray-50">
          {EVALUATION_CRITERIA.map((c) => (
            <li key={c.key} className="flex items-center gap-4 px-5 py-4">
              <div className="flex-1">
                <p className="font-medium text-gray-900">{c.label}</p>
                <p className="text-sm text-gray-500">{c.desc}</p>
              </div>
              {/* Placeholder status until the evaluation workflow is built. */}
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-500 ring-1 ring-inset ring-gray-200">
                Not started
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <ComingSoon
        title="Action items"
        description="Tasks for you — scheduling sessions, uploading credentials, completing assessments — will appear here as your evaluation begins."
      />
    </div>
  );
}
