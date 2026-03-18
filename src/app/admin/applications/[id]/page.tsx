"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ApplicationDetail {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  resumeText: string | null;
  coverLetter: string | null;
  linkedIn: string | null;
  portfolio: string | null;
  yearsExp: string | null;
  startDate: string | null;
  referral: string | null;
  legallyAuth: string | null;
  additionalInfo: string | null;
  status: string;
  createdAt: string;
  job: {
    id: string;
    title: string;
    department: string;
    location: string;
    type: string;
  };
}

const STATUS_COLORS: Record<string, string> = {
  New: "bg-blue-100 text-blue-700",
  Reviewing: "bg-yellow-100 text-yellow-700",
  Interview: "bg-purple-100 text-purple-700",
  Offered: "bg-teal-100 text-teal-700",
  Hired: "bg-green-100 text-green-700",
  Rejected: "bg-red-100 text-red-700",
};

export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [app, setApp] = useState<ApplicationDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("aalb_admin_token");
    if (!token) {
      router.push("/admin");
      return;
    }
    fetch(`/api/applications/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setApp(data);
        setLoading(false);
      })
      .catch(() => {
        router.push("/admin");
      });
  }, [params.id, router]);

  const updateStatus = async (status: string) => {
    const token = localStorage.getItem("aalb_admin_token");
    await fetch(`/api/applications/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    setApp((prev) => (prev ? { ...prev, status } : null));
  };

  if (loading || !app) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-teal-700 font-medium">Loading...</div>
      </div>
    );
  }

  const InfoRow = ({ label, value }: { label: string; value: string | null | undefined }) =>
    value ? (
      <div className="grid grid-cols-3 gap-4 py-3 border-b border-gray-50">
        <dt className="text-sm text-gray-500">{label}</dt>
        <dd className="text-sm text-gray-900 col-span-2">{value}</dd>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-teal-900 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push("/admin")}
            className="inline-flex items-center text-teal-300 hover:text-white text-sm mb-4 transition-colors"
          >
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">
                {app.firstName} {app.lastName}
              </h1>
              <p className="text-teal-200 text-sm mt-1">
                Applied for {app.job.title} &middot; {app.job.department}
              </p>
            </div>
            <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${STATUS_COLORS[app.status]}`}>
              {app.status}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Update */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Update Status</h3>
          <div className="flex flex-wrap gap-2">
            {["New", "Reviewing", "Interview", "Offered", "Hired", "Rejected"].map((status) => (
              <button
                key={status}
                onClick={() => updateStatus(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  app.status === status
                    ? "bg-teal-700 text-white border-teal-700"
                    : "bg-white text-gray-600 border-gray-200 hover:border-teal-300 hover:text-teal-700"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
            <dl>
              <InfoRow label="Full Name" value={`${app.firstName} ${app.lastName}`} />
              <InfoRow label="Email" value={app.email} />
              <InfoRow label="Phone" value={app.phone} />
              <InfoRow label="Address" value={app.address} />
              <InfoRow
                label="Location"
                value={app.city ? `${app.city}${app.state ? `, ${app.state}` : ""} ${app.zipCode || ""}` : null}
              />
            </dl>
          </div>

          {/* Job Info */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Position Details</h3>
            <dl>
              <InfoRow label="Position" value={app.job.title} />
              <InfoRow label="Department" value={app.job.department} />
              <InfoRow label="Location" value={app.job.location} />
              <InfoRow label="Type" value={app.job.type} />
              <InfoRow label="Applied" value={new Date(app.createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} />
            </dl>
          </div>

          {/* Experience */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Experience</h3>
            <dl>
              <InfoRow label="Years of Exp" value={app.yearsExp} />
              <InfoRow label="LinkedIn" value={app.linkedIn} />
              <InfoRow label="Portfolio" value={app.portfolio} />
            </dl>
          </div>

          {/* Additional */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Additional Details</h3>
            <dl>
              <InfoRow label="Start Date" value={app.startDate} />
              <InfoRow label="Referral" value={app.referral} />
              <InfoRow label="Work Auth" value={app.legallyAuth} />
            </dl>
          </div>
        </div>

        {/* Resume */}
        {app.resumeText && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Resume / Experience</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{app.resumeText}</p>
          </div>
        )}

        {/* Cover Letter */}
        {app.coverLetter && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Cover Letter</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{app.coverLetter}</p>
          </div>
        )}

        {/* Additional Info */}
        {app.additionalInfo && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 mt-6">
            <h3 className="font-semibold text-gray-900 mb-4">Additional Information</h3>
            <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">{app.additionalInfo}</p>
          </div>
        )}
      </div>
    </div>
  );
}
