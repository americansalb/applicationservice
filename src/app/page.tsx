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
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight mb-6">
              Build Your Career at{" "}
              <span className="text-teal-300">AALB</span>
            </h1>
            <p className="text-xl text-teal-100 leading-relaxed mb-8">
              The American Association of Lending Businesses is dedicated to
              empowering lending professionals and advancing industry standards.
              Join our team and help shape the future of lending.
            </p>
            <a
              href="#roles"
              className="inline-flex items-center bg-white text-teal-900 px-8 py-4 rounded-xl font-semibold text-lg hover:bg-teal-50 transition-all shadow-lg hover:shadow-xl"
            >
              View Open Roles
              <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="bg-teal-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-teal-900 mb-4">Why Join AALB?</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We offer more than just a job — we offer a mission-driven career with real impact.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-teal-100">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-teal-900 mb-2">Industry Impact</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Shape policies and standards that affect the entire lending industry. Your work makes a real difference.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-teal-100">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-teal-900 mb-2">Collaborative Culture</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Work alongside dedicated professionals who are passionate about excellence and innovation in lending.
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-teal-100">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-teal-900 mb-2">Great Benefits</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Competitive compensation, comprehensive health coverage, retirement plans, and flexible work arrangements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Open Roles */}
      <section id="roles" className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-teal-900 mb-4">Open Positions</h2>
            <p className="text-gray-600">
              {jobs.length} {jobs.length === 1 ? "role" : "roles"} available across{" "}
              {departments.length} {departments.length === 1 ? "department" : "departments"}
            </p>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No open positions right now</h3>
              <p className="text-gray-500">Check back soon for new opportunities!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {departments.map((dept) => (
                <div key={dept}>
                  <h3 className="text-sm font-semibold text-teal-700 uppercase tracking-wider mb-3 mt-8">
                    {dept}
                  </h3>
                  <div className="space-y-3">
                    {jobs
                      .filter((j) => j.department === dept)
                      .map((job) => (
                        <Link
                          key={job.id}
                          href={`/jobs/${job.id}`}
                          className="block bg-white border border-gray-200 rounded-xl p-6 hover:border-teal-300 hover:shadow-md transition-all group"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 group-hover:text-teal-700 transition-colors">
                                {job.title}
                              </h4>
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                  </svg>
                                  {job.location}
                                </span>
                                <span className="flex items-center gap-1">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  {job.type}
                                </span>
                                {job.salary && (
                                  <span className="flex items-center gap-1">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {job.salary}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center text-teal-600 font-medium text-sm group-hover:text-teal-700">
                              View Details
                              <svg className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </div>
                          </div>
                        </Link>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Culture Section */}
      <section id="culture" className="bg-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Our Culture &amp; Values</h2>
            <p className="text-teal-200 text-lg leading-relaxed mb-8">
              At AALB, we believe in fostering an inclusive environment where every voice matters.
              Our team members are our greatest asset, and we invest in their growth and well-being.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10">
              {["Integrity", "Innovation", "Inclusion", "Impact"].map((value) => (
                <div key={value} className="bg-teal-800/50 rounded-xl p-6 border border-teal-700/50">
                  <p className="font-semibold text-lg">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
