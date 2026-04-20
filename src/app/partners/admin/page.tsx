"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Org = {
  id: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  intakeStatus: string;
  step0CompletedAt: string | null;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-700",
  "In Progress": "bg-amber-50 text-amber-700",
  "Submitted": "bg-[#E6F4F6] text-[#00626F]",
  "Needs Clarification": "bg-red-50 text-[#E53E3E]",
  "Approved": "bg-green-50 text-[#38A169]",
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("aalb_partners_token");
    const role = localStorage.getItem("aalb_partners_role");
    if (!token || role !== "admin") {
      router.replace("/partners");
      return;
    }
    fetch("/api/partners/admin/organizations", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) {
          router.replace("/partners");
          return;
        }
        setOrgs(data.organizations);
      })
      .finally(() => setLoading(false));
  }, [router]);

  const logout = () => {
    localStorage.removeItem("aalb_partners_token");
    localStorage.removeItem("aalb_partners_role");
    router.replace("/partners");
  };

  return (
    <div>
      <header className="bg-[#00626F] text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/70">AALB</p>
            <h1 className="text-lg font-semibold">Partner Intake — Admin</h1>
          </div>
          <button onClick={logout} className="text-white/80 hover:text-white text-sm">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-[#1A202C]">Partner Organizations</h2>
            <p className="text-sm text-[#1A202C]/60">
              {orgs.length} {orgs.length === 1 ? "organization" : "organizations"}
            </p>
          </div>
          <Link
            href="/partners/admin/organizations/new"
            className="bg-[#00626F] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#008B8B]"
          >
            + Add Organization
          </Link>
        </div>

        {loading ? (
          <div className="text-[#00626F] animate-pulse">Loading...</div>
        ) : orgs.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#E2E8F0] p-10 text-center">
            <p className="text-[#1A202C]/60 text-sm">No organizations yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orgs.map((org) => (
              <Link
                key={org.id}
                href={`/partners/admin/organizations/${org.id}`}
                className="bg-white rounded-xl border border-[#E2E8F0] p-6 hover:border-[#00626F] hover:shadow-sm transition-all group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-[#1A202C] group-hover:text-[#00626F]">
                    {org.name}
                  </h3>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      STATUS_STYLES[org.intakeStatus] || STATUS_STYLES["Not Started"]
                    }`}
                  >
                    {org.intakeStatus}
                  </span>
                </div>
                {org.contactName && (
                  <p className="text-sm text-[#1A202C]/70">{org.contactName}</p>
                )}
                {org.contactEmail && (
                  <p className="text-xs text-[#1A202C]/60">{org.contactEmail}</p>
                )}
                {org.step0CompletedAt && (
                  <p className="text-xs text-[#38A169] font-medium mt-3">
                    Step 0 Complete &middot;{" "}
                    {new Date(org.step0CompletedAt).toLocaleDateString()}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
