"use client";

import { useRef, useState } from "react";
import { UploadCloud, Check, FileText, Mail, Link2 } from "lucide-react";

const ACCEPT =
  ".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg";

// The plan.collect control: three ways to get the institution's language access
// plan to AALB. Upload it now, email an upload link to a colleague, or paste a
// link. None is required. Upload and email are side effects (the file lands in
// app_plan_document, the email goes out); only the pasted link is a wizard
// answer. The prompt, help, and "why we ask" are rendered by the wizard around
// this, so this is just the controls.
export default function PlanCollect({
  orgName,
  initialDoc,
  linkValue,
  onLinkChange,
}: {
  orgName: string;
  initialDoc: string | null;
  linkValue: string;
  onLinkChange: (v: string) => void;
}) {
  const [docName, setDocName] = useState<string | null>(initialDoc);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [sendErr, setSendErr] = useState("");

  async function upload(file: File) {
    setUploading(true);
    setUploadErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/portal/phase0/plan", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Upload failed.");
      setDocName(data.filename || file.name);
    } catch (e) {
      setUploadErr(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function sendLink() {
    if (!email.trim()) {
      setSendErr("Enter an email address.");
      return;
    }
    setSending(true);
    setSendErr("");
    try {
      const res = await fetch("/api/portal/phase0/plan/send-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Could not send the link.");
      setSentTo(data.email || email.trim());
      setEmail("");
    } catch (e) {
      setSendErr(e instanceof Error ? e.message : "Could not send the link.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* Upload now */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <UploadCloud className="h-4 w-4 text-teal-700" strokeWidth={2} />
          <span className="text-sm font-semibold text-ink">Upload the document</span>
        </div>
        {docName ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-teal-50 px-3 py-2.5 ring-1 ring-inset ring-teal-700/15">
            <span className="flex min-w-0 items-center gap-2 text-sm text-teal-900">
              <Check className="h-4 w-4 shrink-0 text-teal-700" strokeWidth={2.5} />
              <span className="truncate">Received: {docName}</span>
            </span>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="shrink-0 text-xs font-medium text-teal-700 underline-offset-2 hover:underline"
            >
              Replace
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-3 text-sm font-medium text-ink-soft transition hover:border-teal-500/60 hover:bg-zinc-50 disabled:opacity-60"
          >
            <FileText className="h-4 w-4 text-ink-faint" strokeWidth={1.75} />
            {uploading ? "Uploading..." : "Choose a file (PDF, Word, PNG, JPG)"}
          </button>
        )}
        {uploadErr && (
          <p className="mt-2 text-sm font-medium text-clay-600">{uploadErr}</p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Email an upload link */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-teal-700" strokeWidth={2} />
          <span className="text-sm font-semibold text-ink">Email an upload link</span>
        </div>
        {sentTo ? (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-teal-50 px-3 py-2.5 ring-1 ring-inset ring-teal-700/15">
            <span className="flex min-w-0 items-center gap-2 text-sm text-teal-900">
              <Check className="h-4 w-4 shrink-0 text-teal-700" strokeWidth={2.5} />
              <span className="truncate">Link sent to {sentTo}</span>
            </span>
            <button
              type="button"
              onClick={() => setSentTo(null)}
              className="shrink-0 text-xs font-medium text-teal-700 underline-offset-2 hover:underline"
            >
              Send another
            </button>
          </div>
        ) : (
          <>
            <p className="mt-1 text-[13px] leading-snug text-ink-faint">
              Send a colleague, like whoever owns compliance, a link to upload it. No account needed.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSendErr("");
                }}
                placeholder="colleague@hospital.org"
                className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
              />
              <button
                type="button"
                onClick={() => void sendLink()}
                disabled={sending}
                className="shrink-0 rounded-lg bg-teal-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-950 disabled:opacity-60"
              >
                {sending ? "Sending..." : "Send"}
              </button>
            </div>
          </>
        )}
        {sendErr && (
          <p className="mt-2 text-sm font-medium text-clay-600">{sendErr}</p>
        )}
      </div>

      {/* Paste a link */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <Link2 className="h-4 w-4 text-teal-700" strokeWidth={2} />
          <span className="text-sm font-semibold text-ink">Or paste a link</span>
        </div>
        <p className="mt-1 text-[13px] leading-snug text-ink-faint">
          If {orgName}&apos;s plan lives online, an intranet page or shared drive.
        </p>
        <input
          type="url"
          value={linkValue}
          onChange={(e) => onLinkChange(e.target.value)}
          placeholder="https://"
          maxLength={500}
          className="mt-3 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
        />
      </div>
    </div>
  );
}
