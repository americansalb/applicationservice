"use client";

import { useEffect, useState } from "react";
import { interviewInviteUrl } from "@/lib/site";
import { roundLabel } from "@/lib/interviews";

type Job = { id: string; title: string; department: string };

type Question = { id: string; prompt: string };

type Template = {
  id: string;
  slug: string;
  title: string;
  round: number;
  jobId: string | null;
  roleTitle: string | null;
  intro: string | null;
  videoRequired: boolean;
  isActive: boolean;
  questions: Question[];
  job: { id: string; title: string } | null;
  _count: { submissions: number };
  createdAt: string;
};

type FormState = {
  title: string;
  round: number;
  jobId: string;
  roleTitle: string;
  intro: string;
  videoRequired: boolean;
  isActive: boolean;
  questions: { id: string; prompt: string }[];
};

const emptyForm: FormState = {
  title: "",
  round: 1,
  jobId: "",
  roleTitle: "",
  intro: "",
  videoRequired: false,
  isActive: true,
  questions: [{ id: "", prompt: "" }],
};

export default function InterviewBuilder({ token }: { token: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [jobsRes, tplRes] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/admin/interview-templates", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      if (jobsRes.ok) setJobs(await jobsRes.json());
      if (tplRes.ok) setTemplates(await tplRes.json());
    } catch {
      setError("Failed to load interviews.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  };

  const startEdit = (t: Template) => {
    setEditingId(t.id);
    setForm({
      title: t.title,
      round: t.round,
      jobId: t.jobId || "",
      roleTitle: t.roleTitle || "",
      intro: t.intro || "",
      videoRequired: t.videoRequired,
      isActive: t.isActive,
      questions:
        t.questions.length > 0
          ? t.questions.map((q) => ({ id: q.id, prompt: q.prompt }))
          : [{ id: "", prompt: "" }],
    });
    setError("");
    setNotice("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setQuestion = (i: number, prompt: string) => {
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, idx) => (idx === i ? { ...q, prompt } : q)),
    }));
  };

  const addQuestion = () =>
    setForm((f) => ({ ...f, questions: [...f.questions, { id: "", prompt: "" }] }));

  const removeQuestion = (i: number) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.filter((_, idx) => idx !== i),
    }));

  const moveQuestion = (i: number, dir: -1 | 1) =>
    setForm((f) => {
      const next = [...f.questions];
      const j = i + dir;
      if (j < 0 || j >= next.length) return f;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, questions: next };
    });

  const save = async () => {
    setError("");
    setNotice("");
    const title = form.title.trim();
    const questions = form.questions
      .map((q) => ({ id: q.id, prompt: q.prompt.trim() }))
      .filter((q) => q.prompt);
    if (!title) {
      setError("Title is required.");
      return;
    }
    if (questions.length === 0) {
      setError("Add at least one question.");
      return;
    }

    const payload = {
      title,
      round: form.round,
      jobId: form.jobId || null,
      roleTitle: form.roleTitle.trim() || null,
      intro: form.intro.trim() || null,
      videoRequired: form.videoRequired,
      isActive: form.isActive,
      questions,
    };

    setSaving(true);
    try {
      const res = await fetch(
        editingId
          ? `/api/admin/interview-templates/${editingId}`
          : "/api/admin/interview-templates",
        {
          method: editingId ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Save failed.");
        return;
      }
      const saved = data as Template;
      setTemplates((prev) =>
        editingId
          ? prev.map((t) => (t.id === saved.id ? saved : t))
          : [saved, ...prev]
      );
      setNotice(
        editingId
          ? "Interview updated."
          : "Interview created. Copy the invitation link to send to candidates."
      );
      resetForm();
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: Template) => {
    const res = await fetch(`/api/admin/interview-templates/${t.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive: !t.isActive }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error || "Update failed");
      return;
    }
    const updated = (await res.json()) as Template;
    setTemplates((prev) => prev.map((x) => (x.id === t.id ? updated : x)));
  };

  const remove = async (t: Template) => {
    if (
      !window.confirm(
        `Delete the interview "${t.title}"?\n\nThe invitation link will stop working. Existing submissions are kept but will no longer be linked to this interview.`
      )
    )
      return;
    const res = await fetch(`/api/admin/interview-templates/${t.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      window.alert(data.error || "Delete failed");
      return;
    }
    setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    if (editingId === t.id) resetForm();
  };

  const copyLink = async (slug: string) => {
    const url = interviewInviteUrl(slug);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedSlug(slug);
      setTimeout(() => setCopiedSlug((s) => (s === slug ? null : s)), 2000);
    } catch {
      window.prompt("Copy this invitation link:", url);
    }
  };

  return (
    <div className="space-y-8">
      {/* Editor */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-3xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-xl font-bold text-gray-900">
            {editingId ? "Edit interview" : "Create an interview"}
          </h2>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-sm text-gray-500 hover:text-gray-800"
            >
              + New instead
            </button>
          )}
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Build a self-paced video interview and assign it to a role. Candidates
          receive an unguessable invitation link — interviews are invitation-only.
        </p>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Interview title *
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Skills Lab Leader — Round 1 Screen"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Round
              </label>
              <select
                value={form.round}
                onChange={(e) =>
                  setForm((f) => ({ ...f, round: Number(e.target.value) }))
                }
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              >
                {[1, 2, 3].map((r) => (
                  <option key={r} value={r}>
                    {roundLabel(r)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assign to role
              </label>
              <select
                value={form.jobId}
                onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              >
                <option value="">— No specific role —</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} ({j.department})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom role label{" "}
                <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={form.roleTitle}
                onChange={(e) =>
                  setForm((f) => ({ ...f, roleTitle: e.target.value }))
                }
                placeholder="Overrides the role's title in candidate-facing copy"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intro shown to candidates{" "}
              <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={form.intro}
              onChange={(e) => setForm((f) => ({ ...f, intro: e.target.value }))}
              placeholder="A short welcome / instructions. Leave blank to use the default."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
            />
          </div>

          {/* Questions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Questions *
              </label>
              <button
                type="button"
                onClick={addQuestion}
                className="text-sm font-medium text-teal-700 hover:text-teal-900"
              >
                + Add question
              </button>
            </div>
            <div className="space-y-3">
              {form.questions.map((q, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="mt-2.5 text-xs font-semibold text-gray-400 w-6 text-right">
                    {i + 1}.
                  </span>
                  <textarea
                    rows={2}
                    value={q.prompt}
                    onChange={(e) => setQuestion(i, e.target.value)}
                    placeholder="Question prompt…"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  />
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => moveQuestion(i, -1)}
                      disabled={i === 0}
                      className="px-2 py-0.5 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveQuestion(i, 1)}
                      disabled={i === form.questions.length - 1}
                      className="px-2 py-0.5 text-xs rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeQuestion(i)}
                    disabled={form.questions.length === 1}
                    className="mt-1 px-2 py-1 text-xs rounded border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-30"
                    aria-label="Remove question"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-1">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.videoRequired}
                onChange={(e) =>
                  setForm((f) => ({ ...f, videoRequired: e.target.checked }))
                }
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              Require a video answer for every question
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) =>
                  setForm((f) => ({ ...f, isActive: e.target.checked }))
                }
                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              Active (link works for candidates)
            </label>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">
              {error}
            </p>
          )}
          {notice && (
            <p className="text-green-700 text-sm bg-green-50 border border-green-200 p-3 rounded-lg">
              {notice}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="bg-teal-700 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50"
            >
              {saving
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Create interview"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-6 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
            >
              {editingId ? "Cancel" : "Reset"}
            </button>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Your interviews</h2>
          <span className="text-sm text-gray-400">{templates.length} total</span>
        </div>
        {loading ? (
          <p className="px-6 py-10 text-center text-gray-400">Loading…</p>
        ) : templates.length === 0 ? (
          <p className="px-6 py-10 text-center text-gray-400">
            No interviews yet. Create one above.
          </p>
        ) : (
          <div className="divide-y divide-gray-100">
            {templates.map((t) => (
              <div key={t.id} className="px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-teal-100 text-teal-700">
                        {roundLabel(t.round)}
                      </span>
                      <p className="font-medium text-gray-900">{t.title}</p>
                      {!t.isActive && (
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-gray-200 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t.roleTitle || t.job?.title || "No specific role"} ·{" "}
                      {t.questions.length} question
                      {t.questions.length === 1 ? "" : "s"}
                      {t.videoRequired ? " · video required" : ""} ·{" "}
                      {t._count.submissions} submission
                      {t._count.submissions === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => copyLink(t.slug)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold text-teal-700 border border-teal-200 hover:bg-teal-50"
                    >
                      {copiedSlug === t.slug ? "Copied!" : "Copy invite link"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(t)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(t)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50"
                    >
                      {t.isActive ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(t)}
                      className="px-3 py-1.5 rounded-md text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400 break-all">
                  {interviewInviteUrl(t.slug)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
