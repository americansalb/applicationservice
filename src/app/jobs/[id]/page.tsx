import { prisma } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  let job;
  try {
    job = await prisma.job.findUnique({
      where: { id: params.id, isActive: true },
    });
  } catch (e) {
    console.error("Failed to fetch job:", e);
  }

  if (!job) notFound();

  const requirements = job.requirements.split("\n").filter(Boolean);
  const benefits = job.benefits?.split("\n").filter(Boolean) || [];

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-900 to-teal-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Link href="/" className="inline-flex items-center text-teal-300 hover:text-white text-sm mb-6 transition-colors">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to all positions
          </Link>
          <h1 className="text-3xl lg:text-4xl font-bold mb-3">{job.title}</h1>
          <div className="flex flex-wrap gap-4 text-teal-200 text-sm">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              {job.department}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {job.location}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {job.type}
            </span>
            {job.salary && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {job.salary}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-teal-900 mb-4">About This Role</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-line">{job.description}</p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h2 className="text-xl font-bold text-teal-900 mb-4">Requirements</h2>
              <ul className="space-y-3">
                {requirements.map((req, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700">
                    <svg className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {benefits.length > 0 && (
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold text-teal-900 mb-4">Benefits</h2>
                <ul className="space-y-3">
                  {benefits.map((ben, i) => (
                    <li key={i} className="flex items-start gap-3 text-gray-700">
                      <svg className="w-5 h-5 text-teal-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{ben}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 sticky top-6">
              <h3 className="font-semibold text-gray-900 mb-4">Interested?</h3>
              <Link
                href={`/apply/${job.id}`}
                className="block w-full bg-teal-700 text-white text-center py-3 rounded-xl font-semibold hover:bg-teal-800 transition-colors shadow-sm"
              >
                Apply Now
              </Link>
              <p className="text-xs text-gray-400 text-center mt-3">
                Takes about 5-10 minutes
              </p>

              <div className="border-t border-gray-100 mt-6 pt-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Department</p>
                  <p className="text-sm font-medium text-gray-800">{job.department}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Location</p>
                  <p className="text-sm font-medium text-gray-800">{job.location}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Type</p>
                  <p className="text-sm font-medium text-gray-800">{job.type}</p>
                </div>
                {job.salary && (
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Compensation</p>
                    <p className="text-sm font-medium text-gray-800">{job.salary}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider">Posted</p>
                  <p className="text-sm font-medium text-gray-800">
                    {job.createdAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
