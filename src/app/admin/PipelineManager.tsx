"use client";

import { useEffect, useMemo, useState } from "react";
import { accessUrl } from "@/lib/site";
import { roundLabel } from "@/lib/interviews";

type Round = {
  id: string;
  title: string;
  round: number;
  format: string;
  isActive: boolean;
  jobId: string | null;
  job: { id: string; title: string } | null;
};

type Access = {
  id: string;
  token: string;
  interviewId: string;
  jobId: string | null;
  round: number;
  fullName: string;
  email: string;
  phone: string | null;
  status: string;
  submissionId: string | null;
  bookedSlot: string | null;
  createdAt: string;
  interview: { title: string; format: string } | null;
};

const STATUS_STYLE: Record<string, string> = {
  invited: "bg-amber-100 text-amber-800",
  submitted: "bg-blue-100 text-blue-700",
  booked: "bg-teal-100 text-teal-700",
  advanced: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

export default function PipelineManager({ token }: { token: string }) {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [accesses, setAccesses] = useState<Access[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [inviteJob, setInviteJob] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pipeline", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRounds(data.rounds || []);
        setAccesses(data.accesses || []);
      }
    } finally {
      setLoading(false);
    }
  };

  // Group rounds into per-job pipelines.
  const pipelines = useMemo(() => {
    const map = new Map<string, { job: { id: string; title: string }; rounds: Round[] }>();
    for (const r of rounds) {
      if (!r.jobId || !r.job) continue;
      if (!map.has(r.jobId)) map.set(r.jobId, { job: r.job, rounds: [] });
      map.get(r.jobId)!.rounds.push(r);
    }
    for (const p of map.values()) p.rounds.sort((a, b) => a.round - b.round);
    return Array.from(map.values());
  }, [rounds]);

  // Group accesses by candidate within a job.
  const candidatesByJob = useMemo(() => {
    const map = new Map<string, Map<string, Access[]>>();
    for (const a of accesses) {
      if (!a.jobId) continue;
      if (!map.has(a.jobId)) map.set(a.jobId, new Map());
      const byEmail = map.get(a.jobId)!;
      const key = a.email.toLowerCase();
      if (!byEmail.has(key)) byEmail.set(key, []);
      byEmail.get(key)!.push(a);
    }
    for (const byEmail of map.values()) {
      for (const list of byEmail.values()) list.sort((a, b) => a.round - b.round);
    }
    return map;
  }, [accesses]);

  const act = async (accessId: string, action: "advance" | "decline") => {
    setNotice("");
    const res = await fetch(`/api/admin/access/${accessId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      window.alert(data.error || "Action failed");
      return;
    }
    if (action === "advance") {
      setNotice(
        data.final
          ? "Candidate advanced — that was the final round."
          : data.emailed
            ? `Advanced to ${data.next.roundLabel}. Invitation emailed.`
            : `Advanced to ${data.next.roundLabel}. (Email not sent — copy the link from the candidate row.)`
      );
    } else {
      setNotice("Candidate declined.");
    }
    await load();
  };

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Link copied.");
    } catch {
      window.prompt("Copy link:", url);
    }
  };

  if (loading) return <p className="py-10 text-center text-gray-400">Loading…</p>;

  if (pipelines.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
        No job pipelines yet. In <strong>Rounds</strong>, create interviews and assign
        them to a job — they&apos;ll become that job&apos;s ordered pipeline here.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notice && (
        <p className="text-green-700 text-sm bg-green-50 border border-green-200 p-3 rounded-lg">
          {notice}
        </p>
      )}

      {pipelines.map((p) => {
        const byEmail = candidatesByJob.get(p.job.id);
        const candidates = byEmail ? Array.from(byEmail.values()) : [];
        return (
          <div key={p.job.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-bold text-gray-900">{p.job.title}</h3>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {p.rounds.map((r, i) => (
                    <span key={r.id} className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          r.isActive ? "bg-gray-100 text-gray-700" : "bg-gray-100 text-gray-400"
                        }`}
                        title={r.title}
                      >
                        {roundLabel(r.round)}
                        <span className="text-gray-400">
                          · {r.format === "live" ? "live" : "self-paced"}
                        </span>
                      </span>
                      {i < p.rounds.length - 1 && <span className="text-gray-300">→</span>}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setInviteJob(p.job);
                  setNotice("");
                }}
                className="px-3 py-2 rounded-lg text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800 flex-shrink-0"
              >
                + Invite candidate
              </button>
            </div>

            {candidates.length === 0 ? (
              <p className="px-6 py-8 text-center text-gray-400 text-sm">
                No candidates invited yet.
              </p>
            ) : (
              <div className="divide-y divide-gray-100">
                {candidates.map((journey) => {
                  const head = journey[0];
                  const current = journey[journey.length - 1];
                  const canDecide = current.status === "submitted" || current.status === "booked";
                  return (
                    <div key={head.email} className="px-6 py-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900">{head.fullName}</p>
                          <p className="text-xs text-gray-500">
                            {head.email}
                            {head.phone ? ` · ${head.phone}` : ""}
                          </p>
                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            {journey.map((a) => (
                              <span
                                key={a.id}
                                className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                                  STATUS_STYLE[a.status] || "bg-gray-100 text-gray-600"
                                }`}
                                title={a.interview?.title || ""}
                              >
                                {roundLabel(a.round)}: {a.status}
                                {a.bookedSlot
                                  ? ` · ${new Date(a.bookedSlot).toLocaleString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      hour: "numeric",
                                      minute: "2-digit",
                                    })}`
                                  : ""}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {current.status === "invited" && (
                            <button
                              type="button"
                              onClick={() => copy(accessUrl(current.token))}
                              className="px-3 py-1.5 rounded-md text-xs font-semibold text-teal-700 border border-teal-200 hover:bg-teal-50"
                            >
                              Copy link
                            </button>
                          )}
                          {canDecide && (
                            <>
                              <button
                                type="button"
                                onClick={() => act(current.id, "advance")}
                                className="px-3 py-1.5 rounded-md text-xs font-semibold text-white bg-green-600 hover:bg-green-700"
                              >
                                Advance →
                              </button>
                              <button
                                type="button"
                                onClick={() => act(current.id, "decline")}
                                className="px-3 py-1.5 rounded-md text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50"
                              >
                                Decline
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {inviteJob && (
        <InviteModal
          token={token}
          job={inviteJob}
          onClose={() => setInviteJob(null)}
          onDone={(msg) => {
            setInviteJob(null);
            setNotice(msg);
            void load();
          }}
        />
      )}
    </div>
  );
}

function InviteModal({
  token,
  job,
  onClose,
  onDone,
}: {
  token: string;
  job: { id: string; title: string };
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const valid = form.fullName.trim() && /\S+@\S+\.\S+/.test(form.email);

  const submit = async () => {
    if (!valid) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/admin/pipeline/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ jobId: job.id, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Invite failed");
        return;
      }
      onDone(
        data.emailed
          ? `Invited ${form.fullName} to Round 1 — email sent.`
          : `Invited ${form.fullName}. Email not configured — copy their link from the candidate row.`
      );
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-gray-900/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Invite candidate</h3>
          <p className="text-sm text-gray-500">
            Starts <strong>{job.title}</strong> at Round 1. They&apos;ll get a private link.
          </p>
        </div>
        <form
          className="px-6 py-5 space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) submit();
          }}
        >
          <Field label="Full name" value={form.fullName} onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} />
          <Field label="Email" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
          <Field label="Phone (optional)" type="tel" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
          {error && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !valid}
              className="flex-1 bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-800 disabled:opacity-40"
            >
              {submitting ? "Inviting…" : "Send invitation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
      />
    </div>
  );
}
