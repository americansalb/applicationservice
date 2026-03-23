import { prisma } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let jobs: Awaited<ReturnType<typeof prisma.job.findMany>> = [];
  try {
    jobs = await prisma.job.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { applications: true } } },
    });
  } catch (e) {
    console.error("Failed to fetch jobs:", e);
  }

  const departments = [...new Set(jobs.map((j) => j.department))];

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
          <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
            Join Our Team
          </h1>
          <p className="text-lg text-teal-100 max-w-2xl mx-auto mb-8">
            Help shape the future of lending. We&apos;re looking for talented people
            who want to make a real impact in the industry.
          </p>
          {jobs.length > 0 && (
            <a
              href="#roles"
              className="inline-flex items-center bg-white text-teal-900 px-6 py-3 rounded-lg font-semibold hover:bg-teal-50 transition-all shadow-lg"
            >
              View {jobs.length} Open {jobs.length === 1 ? "Role" : "Roles"}
              <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          )}
        </div>
      </section>

      {/* Open Roles */}
      <section id="roles" className="bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-8">
            Open Positions
            <span className="text-gray-400 font-normal text-lg ml-2">
              ({jobs.length})
            </span>
          </h2>

          {jobs.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg font-medium mb-1">No open positions right now</p>
              <p className="text-sm">Check back soon for new opportunities.</p>
            </div>
          ) : (
            <div className="space-y-10">
              {departments.map((dept) => (
                <div key={dept}>
                  <h3 className="text-xs font-semibold text-teal-700 uppercase tracking-wider mb-3">
                    {dept}
                  </h3>
                  <div className="divide-y divide-gray-100">
                    {jobs
                      .filter((j) => j.department === dept)
                      .map((job) => (
                        <Link
                          key={job.id}
                          href={`/jobs/${job.id}`}
                          className="flex flex-col sm:flex-row sm:items-center justify-between py-4 group"
                        >
                          <div>
                            <h4 className="text-base font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                              {job.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-500">
                              <span>{job.location}</span>
                              <span>{job.type}</span>
                              {job.salary && <span>{job.salary}</span>}
                            </div>
                          </div>
                          <span className="text-teal-600 text-sm font-medium mt-2 sm:mt-0 group-hover:text-teal-700 flex items-center">
                            Apply
                            <svg className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
