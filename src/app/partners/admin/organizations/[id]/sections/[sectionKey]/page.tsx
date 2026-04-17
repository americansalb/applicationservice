"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { SECTION_FIELDS, Field } from "@/lib/partnersSections";
import { SECTION_KEYS, SectionKey } from "@/lib/partnersSchema";

type UploadedFile = {
  id: string;
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

type SectionData = {
  meta: { key: string; number: number; title: string; description: string };
  formData: Record<string, unknown>;
  status: string;
  files: UploadedFile[];
  clarifications: Clarification[];
};

const STATUS_STYLES: Record<string, string> = {
  "Not Started": "bg-gray-100 text-gray-600",
  "In Progress": "bg-amber-50 text-amber-700",
  "Submitted": "bg-[#E6F4F6] text-[#00626F]",
  "Under Review": "bg-white text-[#00626F] border border-[#00626F]",
  "Needs Clarification": "bg-red-50 text-[#E53E3E]",
  "Approved": "bg-green-50 text-[#38A169]",
};

function isValidSectionKey(k: string): k is SectionKey {
  return (SECTION_KEYS as readonly string[]).includes(k);
}

export default function AdminSectionReviewPage({
  params,
}: {
  params: { id: string; sectionKey: string };
}) {
  const router = useRouter();
  const [data, setData] = useState<SectionData | null>(null);
  const [orgName, setOrgName] = useState("");
  const [loading, setLoading] = useState(true);
  const [clarifyMode, setClarifyMode] = useState(false);
  const [clarifyMessage, setClarifyMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  const fields: Field[] = useMemo(() => {
    return isValidSectionKey(params.sectionKey) ? SECTION_FIELDS[params.sectionKey] : [];
  }, [params.sectionKey]);

  const getToken = () => localStorage.getItem("aalb_partners_token");

  const load = async () => {
    const token = getToken();
    if (!token) {
      router.replace("/partners");
      return;
    }
    const res = await fetch(
      `/api/partners/sections/${params.sectionKey}?organizationId=${params.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!res.ok) {
      router.replace(`/partners/admin/organizations/${params.id}`);
      return;
    }
    setData(await res.json());

    // Fetch org name for context
    const orgRes = await fetch(
      `/api/partners/admin/organizations/${params.id}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (orgRes.ok) {
      const orgData = await orgRes.json();
      setOrgName(orgData.organization.name);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isValidSectionKey(params.sectionKey)) {
      router.replace(`/partners/admin/organizations/${params.id}`);
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, params.sectionKey]);

  const approve = async () => {
    if (!confirm("Approve this section?")) return;
    setProcessing(true);
    const token = getToken();
    await fetch(`/api/partners/admin/submissions/${params.sectionKey}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ organizationId: params.id, action: "approve" }),
    });
    setProcessing(false);
    await load();
  };

  const requestClarification = async () => {
    if (!clarifyMessage.trim()) return;
    setProcessing(true);
    const token = getToken();
    await fetch(`/api/partners/admin/submissions/${params.sectionKey}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        organizationId: params.id,
        action: "clarify",
        message: clarifyMessage,
      }),
    });
    setClarifyMessage("");
    setClarifyMode(false);
    setProcessing(false);
    await load();
  };

  const formatSize = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
  };

  const renderValue = (field: Field, value: unknown) => {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === "")
    ) {
      return <span className="text-[#1A202C]/40 italic">Not provided</span>;
    }
    if (field.type === "yes_no" || field.type === "yes_no_with_followup") {
      const v = value as { answer?: string; followup?: string };
      return (
        <div>
          <p>{v.answer || <span className="text-[#1A202C]/40 italic">Not provided</span>}</p>
          {v.followup && (
            <p className="text-sm text-[#1A202C]/70 mt-1 whitespace-pre-wrap">{v.followup}</p>
          )}
        </div>
      );
    }
    return <p className="whitespace-pre-wrap">{value as string}</p>;
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-[#00626F] animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <header className="bg-[#00626F] text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href={`/partners/admin/organizations/${params.id}`}
            className="text-white/70 hover:text-white text-sm"
          >
            &larr; Back
          </Link>
          <div className="flex items-start justify-between mt-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">
                {orgName && <>{orgName} · </>}Section {data.meta.number} · Review
              </p>
              <h1 className="text-xl font-semibold mt-1">{data.meta.title}</h1>
            </div>
            <span
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                STATUS_STYLES[data.status]
              }`}
            >
              {data.status}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {!!data.formData._responseType && (
          <div className="bg-[#E6F4F6] border border-[#00626F]/20 rounded-xl p-4 text-sm text-[#00626F]">
            <span className="font-semibold">Response type:</span>{" "}
            {String(data.formData._responseType) === "documents" && "Document upload only"}
            {String(data.formData._responseType) === "questions" && "Written responses only"}
            {String(data.formData._responseType) === "both" && "Documents + written responses"}
            {String(data.formData._responseType) === "not_applicable" && "Marked as not applicable"}
          </div>
        )}

        {String(data.formData._responseType) === "not_applicable" && !!data.formData._notApplicableNotes && (
          <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
            <h2 className="text-base font-semibold text-[#1A202C] mb-2">Partner Notes</h2>
            <p className="text-sm text-[#1A202C] whitespace-pre-wrap">
              {String(data.formData._notApplicableNotes)}
            </p>
          </div>
        )}

        {String(data.formData._responseType) !== "not_applicable" &&
         String(data.formData._responseType) !== "documents" && (
        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
          <h2 className="text-base font-semibold text-[#1A202C] mb-4">Responses</h2>
          <dl className="space-y-4">
            {fields.map((field) => (
              <div key={field.name}>
                <dt className="text-xs font-semibold text-[#1A202C]/60 uppercase tracking-wider mb-1">
                  {field.label}
                </dt>
                <dd className="text-sm text-[#1A202C]">
                  {renderValue(field, data.formData[field.name])}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        )}

        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
          <h2 className="text-base font-semibold text-[#1A202C] mb-3">
            Uploaded Documents
          </h2>
          {data.files.length === 0 ? (
            <p className="text-sm text-[#1A202C]/60">No documents uploaded.</p>
          ) : (
            <ul className="space-y-2">
              {data.files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between bg-[#F5F7FA] rounded-lg px-3 py-2 border border-[#E2E8F0]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A202C] truncate">
                      {f.filename}
                    </p>
                    <p className="text-xs text-[#1A202C]/60">
                      {formatSize(f.sizeBytes)} ·{" "}
                      {new Date(f.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href="#"
                    onClick={async (e) => {
                      e.preventDefault();
                      const t = getToken();
                      const r = await fetch(`/api/partners/files/${f.id}/token`, {
                        headers: { Authorization: `Bearer ${t}` },
                      });
                      const { downloadToken } = await r.json();
                      window.open(`/api/partners/files/${f.id}?dl=${downloadToken}`, "_blank");
                    }}
                    className="text-[#00626F] hover:text-[#008B8B] text-xs font-medium"
                  >
                    Download
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {data.clarifications.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
            <h2 className="text-base font-semibold text-[#1A202C] mb-3">
              Clarification Thread
            </h2>
            <div className="space-y-3">
              {data.clarifications.map((c) => (
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
                    · {new Date(c.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-[#1A202C] whitespace-pre-wrap">{c.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.status !== "Approved" && (
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
                  Approve Section
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
