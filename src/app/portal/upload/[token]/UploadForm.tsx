"use client";

import { useRef, useState } from "react";
import { UploadCloud, Check, FileText } from "lucide-react";

const ACCEPT =
  ".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg";

export default function UploadForm({
  token,
  orgName,
}: {
  token: string;
  orgName: string;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [state, setState] = useState<"idle" | "uploading" | "done" | "error">(
    "idle"
  );
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setState("uploading");
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("token", token);
      if (name.trim()) fd.append("uploaderName", name.trim());
      const res = await fetch("/api/portal/phase0/plan", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Upload failed.");
      setState("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-700/15">
          <Check className="h-7 w-7" strokeWidth={2.25} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-ink">
          Thank you. Your policies were received.
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
          AALB now has {orgName}&apos;s language access policies for review. You can
          close this page.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Upload {orgName}&apos;s language access policies
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
        AALB reviews this as part of {orgName}&apos;s standards. A PDF, Word
        document, or an image is fine, and no account is needed.
      </p>
      <div className="mt-6 space-y-4">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-zinc-50/60 px-4 py-8 text-center transition hover:border-teal-500/60 hover:bg-zinc-50"
        >
          {file ? (
            <>
              <FileText className="h-7 w-7 text-teal-700" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-ink">{file.name}</span>
              <span className="text-[13px] text-ink-faint">
                Choose a different file
              </span>
            </>
          ) : (
            <>
              <UploadCloud className="h-7 w-7 text-ink-faint" strokeWidth={1.75} />
              <span className="text-[15px] font-medium text-ink">
                Choose a file
              </span>
              <span className="text-[13px] text-ink-faint">
                PDF, Word, PNG, or JPG, up to 25MB
              </span>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setError("");
            setState("idle");
          }}
        />
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          maxLength={200}
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
        />
        {error && (
          <p className="text-sm font-medium text-clay-600">{error}</p>
        )}
        <button
          onClick={submit}
          disabled={state === "uploading" || !file}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-teal-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950 disabled:opacity-60"
        >
          {state === "uploading" ? "Uploading..." : "Upload policies"}
        </button>
      </div>
    </div>
  );
}
