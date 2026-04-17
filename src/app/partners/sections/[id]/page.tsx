"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  meta: { key: string; number: number; title: string; description: string; uploadPrompt: string };
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

export default function PartnerSectionPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [data, setData] = useState<SectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string>("");
  const [responseMsg, setResponseMsg] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const formDirtyRef = useRef(false);

  const sectionKey = params.id as SectionKey;
  const fields: Field[] = useMemo(() => {
    return isValidSectionKey(sectionKey) ? SECTION_FIELDS[sectionKey] : [];
  }, [sectionKey]);

  const getToken = () => localStorage.getItem("aalb_partners_token");

  const load = async () => {
    const token = getToken();
    if (!token) {
      router.replace("/partners");
      return;
    }
    try {
      const res = await fetch(`/api/partners/sections/${sectionKey}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setData(await res.json());
    } catch {
      router.replace("/partners/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isValidSectionKey(sectionKey)) {
      router.replace("/partners/dashboard");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey]);

  const locked =
    data?.status === "Submitted" ||
    data?.status === "Approved";

  const updateField = (name: string, value: unknown) => {
    if (!data) return;
    setData({ ...data, formData: { ...data.formData, [name]: value } });
    formDirtyRef.current = true;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => autoSave(), 30_000);
  };

  const autoSave = async () => {
    if (!formDirtyRef.current || !data || locked) return;
    const token = getToken();
    if (!token) return;
    formDirtyRef.current = false;
    setAutoSaveStatus("Saving...");
    try {
      await fetch(`/api/partners/sections/${sectionKey}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formData: data.formData, submit: false }),
      });
      setAutoSaveStatus("Saved");
      setTimeout(() => setAutoSaveStatus(""), 3000);
    } catch {
      setAutoSaveStatus("Save failed");
      formDirtyRef.current = true;
    }
  };

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const save = async (submit: boolean) => {
    if (!data) return;
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/partners/sections/${sectionKey}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formData: data.formData, submit }),
      });
      const result = await res.json();
      if (!res.ok) {
        alert(result.error || "Save failed");
        return;
      }
      await load();
    } finally {
      setSaving(false);
    }
  };

  const uploadFile = async (file: File) => {
    const token = getToken();
    if (!token) return;
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`/api/partners/sections/${sectionKey}/files`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
    const result = await res.json();
    if (!res.ok) {
      alert(result.error || "Upload failed");
      return;
    }
    await load();
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm("Delete this file?")) return;
    const token = getToken();
    if (!token) return;
    await fetch(`/api/partners/sections/${sectionKey}/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  };

  const sendResponse = async () => {
    if (!responseMsg.trim()) return;
    const token = getToken();
    if (!token) return;
    setSendingResponse(true);
    try {
      await fetch(`/api/partners/sections/${sectionKey}/clarifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: responseMsg }),
      });
      setResponseMsg("");
      await load();
    } finally {
      setSendingResponse(false);
    }
  };

  const formatSize = (b: number) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(1)} MB`;
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
          <Link href="/partners/dashboard" className="text-white/70 hover:text-white text-sm inline-flex items-center">
            &larr; Back to dashboard
          </Link>
          <div className="flex items-start justify-between mt-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-white/70">
                Section {data.meta.number}
              </p>
              <h1 className="text-xl font-semibold mt-1">{data.meta.title}</h1>
            </div>
            <span
              className={`text-xs font-medium px-3 py-1.5 rounded-full ${
                STATUS_STYLES[data.status] || STATUS_STYLES["Not Started"]
              }`}
            >
              {data.status}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {data.status === "Needs Clarification" && data.clarifications.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-amber-900 mb-2">
              AALB has requested clarification on this section
            </p>
            <div className="space-y-3">
              {data.clarifications.map((c) => (
                <div key={c.id} className="bg-white rounded-lg p-3 border border-amber-200">
                  <p className="text-xs text-[#1A202C]/60 mb-1">
                    <span className="font-medium text-[#1A202C]">
                      {c.authorRole === "admin" ? "AALB" : c.authorName || "You"}
                    </span>{" "}
                    · {new Date(c.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-[#1A202C] whitespace-pre-wrap">{c.message}</p>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <textarea
                value={responseMsg}
                onChange={(e) => setResponseMsg(e.target.value)}
                rows={3}
                placeholder="Write a response (optional)..."
                className="w-full px-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none"
              />
              <button
                onClick={sendResponse}
                disabled={sendingResponse || !responseMsg.trim()}
                className="mt-2 bg-[#00626F] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#008B8B] disabled:opacity-50"
              >
                {sendingResponse ? "Sending..." : "Send Response"}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
          <p className="text-sm text-[#1A202C]/70 leading-relaxed">
            {data.meta.description}
          </p>
          <p className="text-xs text-[#00626F] bg-[#E6F4F6] border border-[#00626F]/20 rounded-lg px-3 py-2 mt-3">
            <span className="font-semibold">How to complete this section:</span>{" "}
            Upload any documents you already have, then use the optional questions
            below only to fill in anything the documents don&apos;t cover. You
            don&apos;t need to answer every question.
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-base font-semibold text-[#1A202C]">Documents</h2>
            <span className="text-xs font-medium text-[#00626F] bg-[#E6F4F6] px-2 py-0.5 rounded-full">
              Preferred
            </span>
          </div>
          <p className="text-sm text-[#1A202C]/60 mb-4">{data.meta.uploadPrompt}</p>

          {data.files.length > 0 && (
            <ul className="space-y-2 mb-4">
              {data.files.map((f) => (
                <li
                  key={f.id}
                  className="flex items-center justify-between bg-[#F5F7FA] rounded-lg px-3 py-2 border border-[#E2E8F0]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#1A202C] truncate">{f.filename}</p>
                    <p className="text-xs text-[#1A202C]/60">
                      {formatSize(f.sizeBytes)} · {new Date(f.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <a
                      href={`/api/partners/files/${f.id}?token=${getToken()}`}
                      className="text-[#00626F] hover:text-[#008B8B] text-xs font-medium"
                    >
                      Download
                    </a>
                    {!locked && (
                      <button
                        onClick={() => deleteFile(f.id)}
                        className="text-[#E53E3E] hover:text-red-700 text-xs font-medium"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!locked && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadFile(f);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#E2E8F0] rounded-lg w-full py-8 text-sm text-[#1A202C]/60 hover:border-[#00626F] hover:text-[#00626F] hover:bg-[#F5F7FA] transition-colors"
              >
                <span className="block font-medium text-[#1A202C]">Click to upload a file</span>
                <span className="block text-xs mt-1">PDF, DOCX, PNG, JPG · up to 25MB</span>
              </button>
            </>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0] space-y-5">
          <div>
            <h2 className="text-base font-semibold text-[#1A202C]">
              Additional Questions{" "}
              <span className="text-sm font-normal text-[#1A202C]/50">(optional)</span>
            </h2>
            <p className="text-sm text-[#1A202C]/60 mt-1">
              Answer only the questions your uploaded documents don&apos;t already cover.
              Leave the rest blank.
            </p>
          </div>
          {fields.map((field) => (
            <FormField
              key={field.name}
              field={field}
              value={data.formData[field.name]}
              onChange={(v) => updateField(field.name, v)}
              disabled={locked}
            />
          ))}
        </div>

        {!locked && (
          <div className="flex items-center justify-end gap-3">
            {autoSaveStatus && (
              <span className="text-xs text-[#1A202C]/50">{autoSaveStatus}</span>
            )}
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg border border-[#E2E8F0] text-[#1A202C] text-sm font-medium hover:bg-[#F5F7FA] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={() => {
                if (confirm("Submit this section for review? You won't be able to edit until AALB responds.")) {
                  save(true);
                }
              }}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#00626F] text-white text-sm font-semibold hover:bg-[#008B8B] disabled:opacity-50"
            >
              Submit Section
            </button>
          </div>
        )}

        {locked && data.status !== "Approved" && (
          <div className="bg-[#E6F4F6] border border-[#00626F]/30 rounded-xl p-4 text-sm text-[#00626F]">
            This section has been submitted and is locked pending AALB review.
          </div>
        )}
        {data.status === "Approved" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-[#38A169]">
            This section has been approved by AALB.
          </div>
        )}
      </main>
    </div>
  );
}

function FormField({
  field,
  value,
  onChange,
  disabled,
}: {
  field: Field;
  value: unknown;
  onChange: (v: unknown) => void;
  disabled: boolean;
}) {
  const inputBase =
    "w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none disabled:bg-[#F5F7FA] disabled:text-[#1A202C]/60";

  if (field.type === "text") {
    return (
      <div>
        <label className="block text-sm font-medium text-[#1A202C] mb-1.5">{field.label}</label>
        <input
          type="text"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputBase}
        />
      </div>
    );
  }

  if (field.type === "date") {
    return (
      <div>
        <label className="block text-sm font-medium text-[#1A202C] mb-1.5">{field.label}</label>
        <input
          type="date"
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputBase}
        />
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <div>
        <label className="block text-sm font-medium text-[#1A202C] mb-1.5">{field.label}</label>
        <textarea
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={3}
          className={inputBase}
        />
      </div>
    );
  }

  if (field.type === "large_textarea") {
    return (
      <div>
        <label className="block text-sm font-medium text-[#1A202C] mb-1.5">{field.label}</label>
        <textarea
          value={(value as string) || ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={6}
          className={inputBase}
        />
      </div>
    );
  }

  const v = (value as { answer?: string; followup?: string }) || {};

  if (field.type === "yes_no") {
    return (
      <div>
        <label className="block text-sm font-medium text-[#1A202C] mb-1.5">{field.label}</label>
        <select
          value={v.answer || ""}
          onChange={(e) => onChange({ answer: e.target.value })}
          disabled={disabled}
          className={inputBase}
        >
          <option value="">Select...</option>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </div>
    );
  }

  // yes_no_with_followup
  return (
    <div>
      <label className="block text-sm font-medium text-[#1A202C] mb-1.5">{field.label}</label>
      <select
        value={v.answer || ""}
        onChange={(e) => onChange({ ...v, answer: e.target.value })}
        disabled={disabled}
        className={inputBase}
      >
        <option value="">Select...</option>
        <option value="Yes">Yes</option>
        <option value="No">No</option>
      </select>
      {v.answer === "Yes" && (
        <textarea
          value={v.followup || ""}
          onChange={(e) => onChange({ ...v, followup: e.target.value })}
          disabled={disabled}
          rows={3}
          placeholder={field.followupPlaceholder || field.followupLabel}
          className={`${inputBase} mt-2`}
        />
      )}
    </div>
  );
}
