"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ASK_GROUPS, Ask } from "@/lib/partnersSchema";

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

type IntakeData = {
  organization: { id: string; name: string; step0CompletedAt: string | null };
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

export default function IntakePage() {
  const router = useRouter();
  const [data, setData] = useState<IntakeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState("");
  const [responseMsg, setResponseMsg] = useState("");
  const [sendingResponse, setSendingResponse] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const formDirtyRef = useRef(false);
  const dataRef = useRef<IntakeData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentAskRef = useRef<string | null>(null);

  const getToken = () => localStorage.getItem("aalb_partners_token");

  const load = async () => {
    const token = getToken();
    if (!token) {
      router.replace("/partners");
      return;
    }
    try {
      const res = await fetch("/api/partners/intake", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const json = await res.json();
      setData(json);
      dataRef.current = json;
    } catch {
      router.replace("/partners");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  const locked = data?.status === "Submitted" || data?.status === "Approved";

  const updateField = (askId: string, value: string) => {
    if (!data) return;
    const updated = { ...data, formData: { ...data.formData, [askId]: value } };
    setData(updated);
    dataRef.current = updated;
    formDirtyRef.current = true;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(autoSave, 30_000);
  };

  const autoSave = async () => {
    const current = dataRef.current;
    if (!formDirtyRef.current || !current || locked) return;
    const token = getToken();
    if (!token) return;
    formDirtyRef.current = false;
    setAutoSaveStatus("Saving...");
    try {
      await fetch("/api/partners/intake", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formData: current.formData, submit: false }),
      });
      setAutoSaveStatus("Saved");
      setTimeout(() => setAutoSaveStatus(""), 3000);
    } catch {
      setAutoSaveStatus("Save failed");
      formDirtyRef.current = true;
    }
  };

  const save = async (submit: boolean) => {
    const current = dataRef.current;
    if (!current) return;
    const token = getToken();
    if (!token) return;

    if (submit) {
      const missingRequired = ASK_GROUPS.flatMap((g) => g.asks)
        .filter((a) => a.required)
        .filter((a) => {
          const hasFile = current.files.some((f) => f.askId === a.id);
          const hasText = (current.formData[a.id] || "").trim().length > 0;
          return !hasFile && !hasText;
        });
      if (missingRequired.length > 0) {
        alert(
          `Please complete required items before sending:\n${missingRequired.map((a) => `• ${a.id} ${a.label}`).join("\n")}`
        );
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch("/api/partners/intake", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ formData: current.formData, submit }),
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

  const uploadFile = async (askId: string, file: File) => {
    const token = getToken();
    if (!token) return;
    const form = new FormData();
    form.append("file", file);
    form.append("askId", askId);
    setUploadingFor(askId);
    try {
      const res = await fetch("/api/partners/intake/files", {
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
    } finally {
      setUploadingFor(null);
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!confirm("Delete this file?")) return;
    const token = getToken();
    await fetch(`/api/partners/intake/files/${fileId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    await load();
  };

  const downloadFile = async (fileId: string) => {
    const token = getToken();
    const r = await fetch(`/api/partners/files/${fileId}/token`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { downloadToken } = await r.json();
    window.open(`/api/partners/files/${fileId}?dl=${downloadToken}`, "_blank");
  };

  const sendResponse = async () => {
    if (!responseMsg.trim()) return;
    const token = getToken();
    if (!token) return;
    setSendingResponse(true);
    try {
      await fetch("/api/partners/intake/clarifications", {
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

  const logout = () => {
    localStorage.removeItem("aalb_partners_token");
    localStorage.removeItem("aalb_partners_role");
    router.replace("/partners");
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-white/70">
              Americans Against Language Barriers
            </p>
            <h1 className="text-lg font-semibold">Partner Intake Portal</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/partners/change-password" className="text-white/70 hover:text-white">
              Change password
            </Link>
            <button onClick={logout} className="text-white/80 hover:text-white">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-[#1A202C]">
              {data.organization.name}
            </h2>
            <p className="text-sm text-[#1A202C]/60 mt-1">
              Step 0: Institutional Partnership &amp; Standards Alignment
            </p>
          </div>
          <span
            className={`text-xs font-medium px-3 py-1.5 rounded-full ${
              STATUS_STYLES[data.status] || STATUS_STYLES["Not Started"]
            }`}
          >
            {data.status}
          </span>
        </div>

        <div className="bg-white rounded-xl p-6 border border-[#E2E8F0]">
          <p className="text-sm text-[#1A202C]/70 leading-relaxed">
            This intake helps us write your customized Written Standards
            Documentation (per Article 2.1.1 of our service agreement). Job
            descriptions are required; everything else is optional. We&apos;ll
            use the clarification thread to follow up if we need more.
          </p>
        </div>

        {data.status === "Needs Clarification" && data.clarifications.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-amber-900 mb-2">
              AALB has requested clarification
            </p>
            <div className="space-y-3">
              {data.clarifications.map((c) => (
                <div
                  key={c.id}
                  className="bg-white rounded-lg p-3 border border-amber-200"
                >
                  <p className="text-xs text-[#1A202C]/60 mb-1">
                    <span className="font-medium text-[#1A202C]">
                      {c.authorRole === "admin" ? "AALB" : c.authorName || "You"}
                    </span>{" "}
                    &middot; {new Date(c.createdAt).toLocaleString()}
                  </p>
                  <p className="text-sm text-[#1A202C] whitespace-pre-wrap">
                    {c.message}
                  </p>
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

        {/* Hidden file input used by all file asks */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.png,.jpg,.jpeg,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            const askId = currentAskRef.current;
            if (f && askId) uploadFile(askId, f);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
        />

        {ASK_GROUPS.map((group) => (
          <div
            key={group.number}
            className="bg-white rounded-xl p-6 border border-[#E2E8F0] space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#1A202C]">
                {group.number}. {group.title}
              </h2>
              {group.required ? (
                <span className="text-xs font-medium text-[#E53E3E] bg-red-50 px-2 py-0.5 rounded-full">
                  Required
                </span>
              ) : (
                <span className="text-xs font-medium text-[#1A202C]/50 bg-gray-100 px-2 py-0.5 rounded-full">
                  Optional
                </span>
              )}
            </div>
            {group.asks.map((ask) => (
              <AskRow
                key={ask.id}
                ask={ask}
                files={data.files.filter((f) => f.askId === ask.id)}
                textValue={data.formData[ask.id] || ""}
                onTextChange={(v) => updateField(ask.id, v)}
                onUploadClick={() => {
                  currentAskRef.current = ask.id;
                  fileInputRef.current?.click();
                }}
                onDeleteFile={deleteFile}
                onDownloadFile={downloadFile}
                uploading={uploadingFor === ask.id}
                disabled={locked}
                formatSize={formatSize}
              />
            ))}
          </div>
        ))}

        {!locked && (
          <div className="flex items-center justify-end gap-3">
            {autoSaveStatus && (
              <span className="text-xs text-[#1A202C]/50">
                {autoSaveStatus}
              </span>
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
                if (
                  confirm(
                    "Send this to AALB for review? You won't be able to edit until we respond."
                  )
                ) {
                  save(true);
                }
              }}
              disabled={saving}
              className="px-5 py-2.5 rounded-lg bg-[#00626F] text-white text-sm font-semibold hover:bg-[#008B8B] disabled:opacity-50"
            >
              Send to AALB
            </button>
          </div>
        )}

        {data.status === "Submitted" && (
          <div className="bg-[#E6F4F6] border border-[#00626F]/30 rounded-xl p-4 text-sm text-[#00626F]">
            Your intake has been sent to AALB and is locked pending review.
          </div>
        )}
        {data.status === "Approved" && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-[#38A169]">
            Step 0 has been approved by AALB.
            {data.organization.step0CompletedAt && (
              <>
                {" "}
                Completed{" "}
                {new Date(data.organization.step0CompletedAt).toLocaleDateString()}
                .
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function AskRow({
  ask,
  files,
  textValue,
  onTextChange,
  onUploadClick,
  onDeleteFile,
  onDownloadFile,
  uploading,
  disabled,
  formatSize,
}: {
  ask: Ask;
  files: UploadedFile[];
  textValue: string;
  onTextChange: (v: string) => void;
  onUploadClick: () => void;
  onDeleteFile: (fileId: string) => void;
  onDownloadFile: (fileId: string) => void;
  uploading: boolean;
  disabled: boolean;
  formatSize: (b: number) => string;
}) {
  return (
    <div className="border-t border-[#E2E8F0] pt-4 first:border-t-0 first:pt-0">
      <label className="block text-sm font-medium text-[#1A202C]">
        <span className="text-[#1A202C]/40 font-normal mr-1">{ask.id}</span>
        {ask.label}
        {ask.required && <span className="text-[#E53E3E] ml-1">*</span>}
      </label>
      {ask.hint && (
        <p className="text-xs text-[#1A202C]/60 mt-1">{ask.hint}</p>
      )}

      {ask.type === "textarea" && (
        <textarea
          value={textValue}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={disabled}
          rows={4}
          className="mt-2 w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none disabled:bg-[#F5F7FA] disabled:text-[#1A202C]/60"
        />
      )}

      {ask.type === "text" && (
        <input
          type="text"
          value={textValue}
          onChange={(e) => onTextChange(e.target.value)}
          disabled={disabled}
          className="mt-2 w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:ring-2 focus:ring-[#00626F] focus:border-[#00626F] outline-none disabled:bg-[#F5F7FA]"
        />
      )}

      {ask.type === "file" && (
        <div className="mt-2 space-y-2">
          {files.length > 0 && (
            <ul className="space-y-1.5">
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
                  <div className="flex items-center gap-3 ml-3">
                    <button
                      onClick={() => onDownloadFile(f.id)}
                      className="text-[#00626F] hover:text-[#008B8B] text-xs font-medium"
                    >
                      Download
                    </button>
                    {!disabled && (
                      <button
                        onClick={() => onDeleteFile(f.id)}
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
          {!disabled && (
            <button
              onClick={onUploadClick}
              disabled={uploading}
              className="border-2 border-dashed border-[#E2E8F0] rounded-lg w-full py-5 text-sm text-[#1A202C]/60 hover:border-[#00626F] hover:text-[#00626F] hover:bg-[#F5F7FA] transition-colors disabled:opacity-50"
            >
              <span className="block font-medium text-[#1A202C]">
                {uploading ? "Uploading..." : "Upload a file"}
              </span>
              <span className="block text-xs mt-0.5">
                PDF, DOCX, PNG, JPG &middot; up to 25MB
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
