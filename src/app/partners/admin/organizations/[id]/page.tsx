"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ASK_GROUPS } from "@/lib/partnersSchema";

type Org = {
  id: string;
  name: string;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  step0CompletedAt: string | null;
};

type UploadedFile = {
  id: string;
  askId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
};

type Clarification = {
  id: string;
  authorRole: "admin" | "partner";
  authorName: string | null;
  message: string;
  createdAt: string;
};

type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};

type IntakeData = {
  organization: Org;
  status: string;
  formData: Record<string, string>;
  files: UploadedFile[];
  clarifications: Clarification[];
};

const STATUS_STYLES: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-700",
  "In Progress": "bg-amber-50 text-amber-700",
  "Submitted": "bg-[#E6F4F6] text-[#00626F]",
  "Needs Clarification": "bg-red-50 text-[#E53E3E]",
  "Approved": "bg-green-50 text-[#38A169]",
};

export default function AdminOrgReviewPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [intake, setIntake] = useState<IntakeData | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [clarifyMode, setClarifyMode] = useState(false);
  const [clarifyMessage, setClarifyMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [userForm, setUserForm] = useState({ email: "", password: "", name: "" });
  const [userError, setUserError] = useState("");
  const tokenRef = useRef<string | null>(null);

  const getToken = () => tokenRef.current;

  const load = async () => {
    const token = localStorage.getItem("aalb_partners_token");
    tokenRef.current = token;
    if (!token) {
      router.replace("/partners");
      return;
    }
    const [intakeRes, orgRes] = await Promise.all([
      fetch(`/api/partners/intake?organizationId=${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`/api/partners/admin/organizations/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);
    if (!intakeRes.ok || !orgRes.ok) {
      router.replace("/partners/admin");
      return;
    }
    const intakeData = await intakeRes.json();
    const orgData = await orgRes.json();
    setIntake(intakeData);
    setUsers(orgData.users);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const approve = async () => {
    if (!confirm("Approve this intake and mark Step 0 complete?")) return;
    setProcessing(true);
    await fetch(`/api/partners/admin/intake/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ action: "approve" }),
    });
    setProcessing(false);
    await load();
  };

  const requestClarification = async () => {
    if (!clarifyMessage.trim()) return;
    setProcessing(true);
    await fetch(`/api/partners/admin/intake/${params.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
      },
      body: JSON.stringify({ action: "clarify", message: clarifyMessage }),
    });
    setClarifyMessage("");
    setClarifyMode(false);
    setProcessing(false);
    await load();
  };

  const downloadFile = async (fileId: string) => {
    const r = await fetch(`/api/partners/files/${fileId}/token`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });
    const { downloadToken } = await r.json();
    window.open(`/api/partners/files/${fileId}?dl=${downloadToken}`, "_blank");
  };

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError("");
    const res = await fetch(
      `/api/partners/admin/organizations/${params.id}/users`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(userForm),
      }
    );
    const data = await res.json();
    if (!res.ok) {
      setUserError(data.error || "Failed");
      return;
    }
    setUserForm({ email: "", password: "", name: "" });
    setShowAddUser(false);
    await load();
  };

  const formatSize = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  if (loading || !intake) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#00626F] animate-pulse">Loading...</div>
      </div>
    );
  }

  const org = intake.organization;

  return (
    <div>
      <header className="bg-[#00626F] text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link href="/partners/admin" className="text-white/70 hover:text-white text-sm">
            &larr; Back to organizations
          </Link>
          <div className="flex items-start justify-between mt-2">
            <div>
              <h1 className="text-xl font-semibold">{org.name}</h1>
              {org.address && (
                <p className="text-sm text-white/80 mt-1">{org.address}</p>
              )}
              {(org.contactName || org.contactEmail) && (
                <p className="text-sm text-white/70 mt-1">
                  {org.contactName}
                  {org.contactName && org.contactEmail && " · "}
                  {org.contactEmail}
                </p>
              )}
            </div>
            <span
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                STATUS_STYLES[intake.status] || STATUS_STYLES["Not Started"]
              }`}
            >
              {intake.status}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {org.step0CompletedAt && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="font-semibold text-[#38A169]">Step 0 Complete</p>
            <p className="text-sm text-[#1A202C]/70 mt-1">
              Marked complete on {new Date(org.step0CompletedAt).toLocaleDateString()}.
              Standards documentation valid for 2 years per Article 2.1.1.
            </p>
          </div>
        )}

        {/* Consolidated intake review */}
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-[#1A202C]/70 uppercase tracking-wider">
            Step 0 Intake Review
          </h2>

          {ASK_GROUPS.map((group) => (
            <div
              key={group.number}
              className="bg-white rounded-xl border border-[#E2E8F0] p-5"
            >
              <h3 className="text-sm font-semibold text-[#1A202C] mb-3">
                {group.number}. {group.title}
              </h3>
              <dl className="space-y-4">
                {group.asks.map((ask) => {
                  const files = intake.files.filter((f) => f.askId === ask.id);
                  const text = intake.formData[ask.id] || "";
                  const hasAnything = files.length > 0 || text.trim().length > 0;
                  return (
                    <div key={ask.id}>
                      <dt className="text-xs font-medium text-[#1A202C]/70">
                        <span className="text-[#1A202C]/40 font-normal mr-1">
                          {ask.id}
                        </span>
                        {ask.label}
                      </dt>
                      <dd className="mt-1.5">
                        {!hasAnything && (
                          <p className="text-xs text-[#1A202C]/40 italic">
                            Not provided
                          </p>
                        )}
                        {text.trim().length > 0 && (
                          <p className="text-sm text-[#1A202C] whitespace-pre-wrap bg-[#F5F7FA] rounded-lg p-3">
                            {text}
                          </p>
                        )}
                        {files.length > 0 && (
                          <ul className="space-y-1.5 mt-2">
                            {files.map((f) => (
                              <li
                                key={f.id}
                                className="flex items-center justify-between bg-[#F5F7FA] rounded-lg px-3 py-2 border border-[#E2E8F0] text-sm"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-[#1A202C] truncate">
                                    {f.filename}
                                  </p>
                                  <p className="text-xs text-[#1A202C]/60">
                                    {formatSize(f.sizeBytes)} &middot;{" "}
                                    {new Date(f.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <button
                                  onClick={() => downloadFile(f.id)}
                                  className="text-[#00626F] hover:text-[#008B8B] text-xs font-medium ml-3"
                                >
                                  Download
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </div>
          ))}
        </section>

        {/* Clarification thread */}
        {intake.clarifications.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
            <h2 className="text-base font-semibold text-[#1A202C] mb-3">
              Clarification Thread
            </h2>
            <div className="space-y-3">
              {intake.clarifications.map((c) => (
                <div
                  key={c.id}
                  className={`rounded-lg p-3 border ${
                    c.authorRole === "admin"
                      ? "bg-[#E6F4F6] border-[#00626F]/20"
                      : "bg-amber-50 border-amber-200"
                  }`}
                >
                  <p className="text-xs text-[#1A202C]/70 mb-1">
                    <span className="font-medium">
                      {c.authorRole === "admin" ? "AALB" : c.authorName || "Partner"}
                    </span>{" "}
                    &middot; {new Date(c.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-[#1A202C] whitespace-pre-wrap">
                    {c.message}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decision */}
        {intake.status !== "Approved" && (
          <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
            <h2 className="text-base font-semibold text-[#1A202C] mb-3">Decision</h2>
            {clarifyMode ? (
              <div>
                <label className="block text-sm font-medium text-[#1A202C] mb-1.5">
                  Clarification message to partner
                </label>
                <textarea
                  value={clarifyMessage}
                  onChange={(e) => setClarifyMessage(e.target.value)}
                  rows={4}
                  placeholder="Explain what's missing or unclear..."
                  className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
                />
                <div className="flex justify-end gap-3 mt-3">
                  <button
                    onClick={() => {
                      setClarifyMode(false);
                      setClarifyMessage("");
                    }}
                    className="px-4 py-2 rounded-lg border border-[#E2E8F0] text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={requestClarification}
                    disabled={!clarifyMessage.trim() || processing}
                    className="px-4 py-2 rounded-lg bg-[#D69E2E] text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50"
                  >
                    Send Clarification Request
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  onClick={() => setClarifyMode(true)}
                  disabled={processing}
                  className="flex-1 px-4 py-2.5 rounded-lg border border-[#D69E2E] text-[#D69E2E] text-sm font-semibold hover:bg-amber-50"
                >
                  Request Clarification
                </button>
                <button
                  onClick={approve}
                  disabled={processing}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-[#38A169] text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
                >
                  Approve Step 0
                </button>
              </div>
            )}
          </div>
        )}

        {/* Partner users */}
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
                  onChange={(e) =>
                    setUserForm({ ...userForm, email: e.target.value })
                  }
                  className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
                />
                <input
                  type="text"
                  placeholder="Name (optional)"
                  value={userForm.name}
                  onChange={(e) =>
                    setUserForm({ ...userForm, name: e.target.value })
                  }
                  className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
                />
                <input
                  type="text"
                  required
                  placeholder="Temporary password"
                  value={userForm.password}
                  onChange={(e) =>
                    setUserForm({ ...userForm, password: e.target.value })
                  }
                  className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
                />
              </div>
              {userError && (
                <p className="text-sm text-[#E53E3E]">{userError}</p>
              )}
              <p className="text-xs text-[#1A202C]/60">
                Password must be 10+ characters with uppercase, lowercase, number, and special character.
              </p>
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
