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
  step0CompletedAt: string | null;
};

type Section = {
  key: string;
  number: number;
  title: string;
  status: string;
};

type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

const STATUS_STYLES: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-600",
  "In Progress": "bg-amber-50 text-amber-700",
  "Submitted": "bg-[#E6F4F6] text-[#00626F]",
  "Under Review": "bg-white text-[#00626F] border border-[#00626F]",
  "Needs Clarification": "bg-red-50 text-[#E53E3E]",
  "Approved": "bg-green-50 text-[#38A169]",
};

export default function AdminOrgDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [org, setOrg] = useState<Org | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ email: "", password: "", name: "" });
  const [userError, setUserError] = useState("");
  const [loading, setLoading] = useState(true);
  const [completingStep0, setCompletingStep0] = useState(false);

  const getToken = () => localStorage.getItem("aalb_partners_token");

  const load = async () => {
    const token = getToken();
    if (!token) {
      router.replace("/partners");
      return;
    }
    const res = await fetch(`/api/partners/admin/organizations/${params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      router.replace("/partners/admin");
      return;
    }
    const data = await res.json();
    setOrg(data.organization);
    setSections(data.sections);
    setUsers(data.users);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError("");
    const token = getToken();
    const res = await fetch(`/api/partners/admin/organizations/${params.id}/users`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(userForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setUserError(data.error || "Failed");
      return;
    }
    setUserForm({ email: "", password: "", name: "" });
    setShowAddUser(false);
    await load();
  };

  const markStep0Complete = async () => {
    if (!confirm("Mark Step 0 as complete for this organization?")) return;
    setCompletingStep0(true);
    const token = getToken();
    const res = await fetch(`/api/partners/admin/organizations/${params.id}/complete`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed");
    }
    setCompletingStep0(false);
    await load();
  };

  if (loading || !org) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#00626F] animate-pulse">Loading...</div>
      </div>
    );
  }

  const approvedCount = sections.filter((s) => s.status === "Approved").length;
  const allApproved = approvedCount === 4;

  return (
    <div>
      <header className="bg-[#00626F] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/partners/admin" className="text-white/70 hover:text-white text-sm">
            &larr; Back to organizations
          </Link>
          <h1 className="text-xl font-semibold mt-2">{org.name}</h1>
          {org.address && <p className="text-sm text-white/80 mt-1">{org.address}</p>}
          {(org.contactName || org.contactEmail) && (
            <p className="text-sm text-white/70 mt-1">
              {org.contactName}
              {org.contactName && org.contactEmail && " · "}
              {org.contactEmail}
            </p>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {org.step0CompletedAt ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-semibold text-[#38A169]">Step 0 Complete</p>
              <p className="text-sm text-[#1A202C]/70">
                Marked complete on {new Date(org.step0CompletedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#1A202C]">
                <span className="font-semibold">{approvedCount} / 4</span> sections approved
              </p>
              {allApproved && (
                <p className="text-xs text-[#38A169] mt-1">Ready to mark Step 0 complete</p>
              )}
            </div>
            <button
              onClick={markStep0Complete}
              disabled={!allApproved || completingStep0}
              className="bg-[#00626F] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#008B8B] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark Step 0 Complete
            </button>
          </div>
        )}

        <section>
          <h2 className="text-sm font-semibold text-[#1A202C]/70 uppercase tracking-wider mb-3">
            Intake Sections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sections.map((s) => (
              <Link
                key={s.key}
                href={`/partners/admin/organizations/${params.id}/sections/${s.key}`}
                className="bg-white rounded-xl border border-[#E2E8F0] p-5 hover:border-[#00626F] transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-semibold text-[#00626F]">
                    Section {s.number}
                  </span>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      STATUS_STYLES[s.status]
                    }`}
                  >
                    {s.status}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-[#1A202C]">{s.title}</h3>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#1A202C]/70 uppercase tracking-wider">
              Partner Users
            </h2>
            <button
              onClick={() => setShowAddUser(!showAddUser)}
              className="text-[#00626F] hover:text-[#008B8B] text-sm font-medium"
            >
              {showAddUser ? "Cancel" : "+ Add User"}
            </button>
          </div>

          {showAddUser && (
            <form
              onSubmit={createUser}
              className="bg-white rounded-xl border border-[#E2E8F0] p-5 mb-4 space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="email"
                  required
                  placeholder="Email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
                />
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="Temporary password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
                />
              </div>
              {userError && <p className="text-sm text-[#E53E3E]">{userError}</p>}
              <button
                type="submit"
                className="bg-[#00626F] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#008B8B]"
              >
                Create User
              </button>
            </form>
          )}

          {users.length === 0 ? (
            <p className="text-sm text-[#1A202C]/60">No users yet.</p>
          ) : (
            <div className="bg-white rounded-xl border border-[#E2E8F0] divide-y divide-[#E2E8F0]">
              {users.map((u) => (
                <div key={u.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[#1A202C]">
                      {u.name || u.email}
                    </p>
                    {u.name && (
                      <p className="text-xs text-[#1A202C]/60">{u.email}</p>
                    )}
                  </div>
                  <p className="text-xs text-[#1A202C]/60">
                    Added {new Date(u.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
