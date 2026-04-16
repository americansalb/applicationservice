"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Section = {
  key: string;
  number: number;
  title: string;
  description: string;
  status: string;
  updatedAt: string | null;
};

type Data = {
  organization: { id: string; name: string; address: string | null; step0CompletedAt: string | null };
  sections: Section[];
};

const STATUS_STYLES: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-600 border-gray-200",
  "In Progress": "bg-amber-50 text-amber-700 border-amber-200",
  "Submitted": "bg-[#E6F4F6] text-[#00626F] border-[#00626F]/20",
  "Under Review": "bg-white text-[#00626F] border-[#00626F]",
  "Needs Clarification": "bg-red-50 text-[#E53E3E] border-red-200",
  "Approved": "bg-green-50 text-[#38A169] border-green-200",
};

export default function PartnerDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("aalb_partners_token");
    if (!token) {
      router.replace("/partners");
      return;
    }
    fetch("/api/partners/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(setData)
      .catch(() => router.replace("/partners"))
      .finally(() => setLoading(false));
  }, [router]);

  const logout = () => {
    localStorage.removeItem("aalb_partners_token");
    localStorage.removeItem("aalb_partners_role");
    router.replace("/partners");
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#00626F] animate-pulse">Loading...</div>
      </div>
    );
  }

  const approvedCount = data.sections.filter((s) => s.status === "Approved").length;

  return (
    <div>
      <header className="bg-[#00626F] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/70">
              Americans Against Language Barriers
            </p>
            <h1 className="text-lg font-semibold">Partner Intake Portal</h1>
          </div>
          <button onClick={logout} className="text-white/80 hover:text-white text-sm">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[#1A202C]">{data.organization.name}</h2>
          {data.organization.address && (
            <p className="text-sm text-[#1A202C]/60 mt-1">{data.organization.address}</p>
          )}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 bg-[#E2E8F0] rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#00626F] h-2 transition-all"
                style={{ width: `${(approvedCount / 4) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-[#1A202C]">
              {approvedCount} / 4 approved
            </span>
          </div>
          {data.organization.step0CompletedAt && (
            <p className="text-sm text-[#38A169] mt-3 font-medium">
              Step 0 marked complete on{" "}
              {new Date(data.organization.step0CompletedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        <h3 className="text-sm font-semibold text-[#1A202C]/70 uppercase tracking-wider mb-3">
          Step 0: Institutional Partnership &amp; Standards Alignment
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.sections.map((section) => (
            <Link
              key={section.key}
              href={`/partners/sections/${section.key}`}
              className="bg-white rounded-xl border border-[#E2E8F0] p-6 hover:border-[#00626F] hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs font-semibold text-[#00626F]">
                  Section {section.number}
                </span>
                <span
                  className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                    STATUS_STYLES[section.status] || STATUS_STYLES["Not Started"]
                  }`}
                >
                  {section.status}
                </span>
              </div>
              <h4 className="text-base font-semibold text-[#1A202C] group-hover:text-[#00626F] transition-colors">
                {section.title}
              </h4>
              <p className="text-sm text-[#1A202C]/60 mt-2 line-clamp-3">
                {section.description}
              </p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
