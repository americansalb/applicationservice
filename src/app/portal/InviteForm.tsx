"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Plus, X, Copy, Check, Mail, ChevronDown } from "lucide-react";
import type { Phase0Config } from "@/lib/phase0Config";

// Loaded on demand: pulls in the metro/language datasets only when a developer
// opens the optional "what we know" block, keeping both dashboards light.
const Phase0ConfigFields = dynamic(() => import("./phase0/Phase0ConfigFields"), {
  ssr: false,
});

type Organization = { id: string; name: string };
type Result = { url: string; emailed: boolean; email: string };

export default function InviteForm({
  mode,
  organizations = [],
}: {
  mode: "developer" | "manager";
  organizations?: Organization[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"DEVELOPER" | "MANAGER" | "PROFESSIONAL">(
    "PROFESSIONAL"
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [orgChoice, setOrgChoice] = useState(
    organizations[0]?.id ?? "__new__"
  );
  const [newOrg, setNewOrg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);
  const [config, setConfig] = useState<Phase0Config>({});
  const [showConfig, setShowConfig] = useState(false);

  function close() {
    setOpen(false);
    setResult(null);
    setError(null);
    setName("");
    setEmail("");
    setNewOrg("");
    setRole("PROFESSIONAL");
    setConfig({});
    setShowConfig(false);
    if (result) router.refresh();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const payload: Record<string, unknown> = { email, name, role };
      // Developers (AALB staff) have no organization.
      if (mode === "developer" && role !== "DEVELOPER") {
        if (orgChoice === "__new__") {
          payload.organizationName = newOrg;
          payload.phase0Config = config;
        } else payload.organizationId = orgChoice;
      }
      const res = await fetch("/api/portal/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not create the invitation.");
        setLoading(false);
        return;
      }
      setResult({ url: data.url, emailed: data.emailed, email });
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <button
        onClick={() => {
          setOpen(true);
          setResult(null);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        Invite people
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <div className="fixed inset-0 bg-ink/40 backdrop-blur-sm" onClick={close} />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-zinc-200 bg-white shadow-panel">
            <div className="flex items-center justify-between border-b border-zinc-200/70 px-6 py-4">
              <h3 className="font-display text-lg font-medium text-ink">
                {result ? "Invitation ready" : "Invite someone"}
              </h3>
              <button
                onClick={close}
                aria-label="Close"
                className="rounded-md p-1 text-ink-faint transition hover:bg-zinc-100 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {result ? (
              <div className="p-6">
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-teal-700/20 bg-teal-50 px-3 py-2 text-sm text-teal-800">
                  <Mail className="h-4 w-4" strokeWidth={1.75} />
                  {result.emailed
                    ? `Invitation emailed to ${result.email}.`
                    : `Invite created for ${result.email}. Share this link with them.`}
                </div>
                <label className="mb-1.5 block text-xs font-medium text-ink-soft">
                  Invitation link
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={result.url}
                    onFocus={(e) => e.currentTarget.select()}
                    className="block w-full rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-ink outline-none"
                  />
                  <button
                    onClick={copy}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-zinc-300 px-3 text-sm font-medium text-ink-soft transition hover:bg-zinc-100"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-teal-700" strokeWidth={2} />
                    ) : (
                      <Copy className="h-4 w-4" strokeWidth={1.75} />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-ink-faint">
                  The link is single-use and expires in 14 days.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => setResult(null)}
                    className="rounded-lg px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-zinc-100"
                  >
                    Invite another
                  </button>
                  <button
                    onClick={close}
                    className="rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-950"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="p-6">
                {error && (
                  <div className="mb-4 rounded-lg border border-clay-500/30 bg-clay-100 px-3 py-2 text-sm text-clay-700">
                    {error}
                  </div>
                )}
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name (optional)">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                      placeholder="Jordan Rivera"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={inputClass}
                      placeholder="jordan@organization.org"
                    />
                  </Field>

                  <Field label="Role">
                    <select
                      value={role}
                      onChange={(e) =>
                        setRole(
                          e.target.value as
                            | "DEVELOPER"
                            | "MANAGER"
                            | "PROFESSIONAL"
                        )
                      }
                      className={inputClass}
                    >
                      <option value="PROFESSIONAL">Professional</option>
                      <option value="MANAGER">Manager</option>
                      {mode === "developer" && (
                        <option value="DEVELOPER">Developer</option>
                      )}
                    </select>
                  </Field>

                  {mode === "developer" && role !== "DEVELOPER" && (
                    <Field label="Organization">
                      <select
                        value={orgChoice}
                        onChange={(e) => setOrgChoice(e.target.value)}
                        className={inputClass}
                      >
                        {organizations.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                        <option value="__new__">+ New organization</option>
                      </select>
                    </Field>
                  )}

                  {mode === "developer" && role !== "DEVELOPER" && orgChoice === "__new__" && (
                    <Field label="New organization name" full>
                      <input
                        required
                        value={newOrg}
                        onChange={(e) => setNewOrg(e.target.value)}
                        className={inputClass}
                        placeholder="University Hospital"
                      />
                    </Field>
                  )}
                </div>

                {mode === "developer" &&
                  role !== "DEVELOPER" &&
                  orgChoice === "__new__" && (
                    <div className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4">
                      <button
                        type="button"
                        onClick={() => setShowConfig((s) => !s)}
                        className="flex w-full items-center justify-between gap-2 text-left"
                      >
                        <span>
                          <span className="block text-sm font-semibold text-ink">
                            Add what you already know (optional)
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-faint">
                            Sector, setting, languages, and locations pre-fill
                            their questionnaire.
                          </span>
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 shrink-0 text-ink-faint transition ${
                            showConfig ? "rotate-180" : ""
                          }`}
                          strokeWidth={2}
                        />
                      </button>
                      {showConfig && (
                        <div className="mt-4 border-t border-zinc-200 pt-4">
                          <Phase0ConfigFields value={config} onChange={setConfig} />
                        </div>
                      )}
                    </div>
                  )}

                <div className="mt-6 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-lg px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-zinc-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950 disabled:opacity-60"
                  >
                    {loading ? "Creating" : "Create invitation"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const inputClass =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink-faint/60 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}
