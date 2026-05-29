"use client";

import { useEffect, useMemo, useState } from "react";
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

const WIZARD_STEPS = ["Basics", "Questions", "Settings", "Review"] as const;

export default function InterviewBuilder({ token }: { token: string }) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  // null = list view; otherwise the wizard is open (create or edit).
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Template | null>(null);

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

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setStep(0);
    setError("");
    setNotice("");
    setCreated(null);
    setWizardOpen(true);
    scrollTop();
  };

  const openEdit = (t: Template) => {
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
    setStep(0);
    setError("");
    setNotice("");
    setCreated(null);
    setWizardOpen(true);
    scrollTop();
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setStep(0);
    setError("");
    setCreated(null);
  };

  const scrollTop = () => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---- question editing ----
  const setQuestion = (i: number, prompt: string) =>
    setForm((f) => ({
      ...f,
      questions: f.questions.map((q, idx) => (idx === i ? { ...q, prompt } : q)),
    }));
  const addQuestion = () =>
    setForm((f) => ({ ...f, questions: [...f.questions, { id: "", prompt: "" }] }));
  const removeQuestion = (i: number) =>
    setForm((f) => ({ ...f, questions: f.questions.filter((_, idx) => idx !== i) }));
  const moveQuestion = (i: number, dir: -1 | 1) =>
    setForm((f) => {
      const next = [...f.questions];
      const j = i + dir;
      if (j < 0 || j >= next.length) return f;
      [next[i], next[j]] = [next[j], next[i]];
      return { ...f, questions: next };
    });

  const cleanQuestions = useMemo(
    () =>
      form.questions
        .map((q) => ({ id: q.id, prompt: q.prompt.trim() }))
        .filter((q) => q.prompt),
    [form.questions]
  );

  const stepValid = (s: number): boolean => {
    if (s === 0) return !!form.title.trim();
    if (s === 1) return cleanQuestions.length > 0;
    return true;
  };

  const next = () => {
    setError("");
    if (!stepValid(step)) {
      setError(
        step === 0 ? "Give the interview a title to continue." : "Add at least one question."
      );
      return;
    }
    setStep((s) => Math.min(s + 1, WIZARD_STEPS.length - 1));
  };
  const back = () => {
    setError("");
    setStep((s) => Math.max(s - 1, 0));
  };
  const goTo = (s: number) => {
    // allow jumping back, or forward only if intervening steps are valid
    if (s <= step || [...Array(s).keys()].every((i) => stepValid(i))) {
      setError("");
      setStep(s);
    }
  };

  const roleLabel =
    form.roleTitle.trim() ||
    jobs.find((j) => j.id === form.jobId)?.title ||
    "No specific role";

  const save = async () => {
    setError("");
    const title = form.title.trim();
    if (!title) {
      setStep(0);
      setError("Title is required.");
      return;
    }
    if (cleanQuestions.length === 0) {
      setStep(1);
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
      questions: cleanQuestions,
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
        editingId ? prev.map((t) => (t.id === saved.id ? saved : t)) : [saved, ...prev]
      );
      if (editingId) {
        setNotice(`“${saved.title}” updated.`);
        closeWizard();
      } else {
        setCreated(saved); // show success screen with the invite link
      }
    } catch {
      setError("Network error.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (t: Template) => {
    const res = await fetch(`/api/admin/interview-templates/${t.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
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

  // ---------------- render ----------------
  if (wizardOpen) {
    return (
      <Wizard
        editing={!!editingId}
        step={step}
        form={form}
        setForm={setForm}
        jobs={jobs}
        roleLabel={roleLabel}
        cleanCount={cleanQuestions.length}
        error={error}
        saving={saving}
        created={created}
        stepValid={stepValid}
        onGoTo={goTo}
        onNext={next}
        onBack={back}
        onSave={save}
        onClose={closeWizard}
        onCreateAnother={openCreate}
        onCopyLink={copyLink}
        copiedSlug={copiedSlug}
        setQuestion={setQuestion}
        addQuestion={addQuestion}
        removeQuestion={removeQuestion}
        moveQuestion={moveQuestion}
      />
    );
  }

  return (
    <div className="space-y-6">
      {notice && (
        <p className="text-green-700 text-sm bg-green-50 border border-green-200 p-3 rounded-lg">
          {notice}
        </p>
      )}

      {/* Create CTA */}
      <button
        type="button"
        onClick={openCreate}
        className="group w-full rounded-2xl border-2 border-dashed border-teal-200 bg-gradient-to-br from-teal-50 to-white px-6 py-7 text-left hover:border-teal-400 hover:from-teal-100 transition-colors"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white text-2xl shadow-sm group-hover:scale-105 transition-transform">
            +
          </span>
          <div>
            <p className="text-lg font-semibold text-teal-900">Create an interview</p>
            <p className="text-sm text-teal-700/80">
              A guided 4-step setup. Assign it to a role and get a shareable
              invitation link.
            </p>
          </div>
        </div>
      </button>

      {/* List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-gray-900">Your interviews</h2>
          <span className="text-sm text-gray-400">{templates.length} total</span>
        </div>
        {loading ? (
          <p className="py-10 text-center text-gray-400">Loading…</p>
        ) : templates.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center text-gray-400">
            No interviews yet — create your first one above.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {templates.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-gray-100 bg-white shadow-sm p-5 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
                        {roundLabel(t.round)}
                      </span>
                      {t.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Live
                        </span>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-gray-900 mt-2 truncate">{t.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t.roleTitle || t.job?.title || "No specific role"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-teal-900 leading-none">
                      {t._count.submissions}
                    </p>
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">
                      {t._count.submissions === 1 ? "response" : "responses"}
                    </p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mt-3">
                  {t.questions.length} question{t.questions.length === 1 ? "" : "s"}
                  {t.videoRequired ? " · video required" : " · video optional"}
                </p>

                <div className="mt-3 flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2">
                  <span className="text-xs text-gray-500 truncate flex-1">
                    {interviewInviteUrl(t.slug)}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyLink(t.slug)}
                    className="px-2.5 py-1 rounded-md text-xs font-semibold text-teal-700 border border-teal-200 hover:bg-teal-50 flex-shrink-0"
                  >
                    {copiedSlug === t.slug ? "Copied!" : "Copy link"}
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
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
                    className="ml-auto px-3 py-1.5 rounded-md text-xs font-semibold text-red-700 border border-red-200 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================= Wizard =============================

function Wizard(props: {
  editing: boolean;
  step: number;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  jobs: Job[];
  roleLabel: string;
  cleanCount: number;
  error: string;
  saving: boolean;
  created: Template | null;
  stepValid: (s: number) => boolean;
  onGoTo: (s: number) => void;
  onNext: () => void;
  onBack: () => void;
  onSave: () => void;
  onClose: () => void;
  onCreateAnother: () => void;
  onCopyLink: (slug: string) => void;
  copiedSlug: string | null;
  setQuestion: (i: number, v: string) => void;
  addQuestion: () => void;
  removeQuestion: (i: number) => void;
  moveQuestion: (i: number, dir: -1 | 1) => void;
}) {
  const {
    editing,
    step,
    form,
    setForm,
    jobs,
    roleLabel,
    cleanCount,
    error,
    saving,
    created,
    stepValid,
    onGoTo,
    onNext,
    onBack,
    onSave,
    onClose,
    onCreateAnother,
    onCopyLink,
    copiedSlug,
    setQuestion,
    addQuestion,
    removeQuestion,
    moveQuestion,
  } = props;

  const isLast = step === WIZARD_STEPS.length - 1;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-900 to-teal-700 px-6 sm:px-8 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {created
                  ? "Interview created"
                  : editing
                    ? "Edit interview"
                    : "Create an interview"}
              </h2>
              <p className="text-teal-200 text-sm mt-0.5">
                {created
                  ? "Share the invitation link below with candidates."
                  : "Self-paced · video + written · invitation-only"}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-teal-200 hover:text-white text-2xl leading-none"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {created ? (
          <SuccessPanel
            created={created}
            editing={editing}
            onCopyLink={onCopyLink}
            copiedSlug={copiedSlug}
            onCreateAnother={onCreateAnother}
            onClose={onClose}
          />
        ) : (
          <>
            <Stepper step={step} onGoTo={onGoTo} stepValid={stepValid} />

            <div className="p-6 sm:p-8">
              {step === 0 && <BasicsStep form={form} setForm={setForm} jobs={jobs} />}
              {step === 1 && (
                <QuestionsStep
                  form={form}
                  setQuestion={setQuestion}
                  addQuestion={addQuestion}
                  removeQuestion={removeQuestion}
                  moveQuestion={moveQuestion}
                />
              )}
              {step === 2 && <SettingsStep form={form} setForm={setForm} />}
              {step === 3 && (
                <ReviewStep form={form} roleLabel={roleLabel} cleanCount={cleanCount} />
              )}

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg mt-5">
                  {error}
                </p>
              )}

              {/* Footer nav */}
              <div className="flex items-center gap-3 mt-7">
                <button
                  type="button"
                  onClick={step === 0 ? onClose : onBack}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                >
                  {step === 0 ? "Cancel" : "← Back"}
                </button>
                <span className="text-xs text-gray-400 ml-auto">
                  Step {step + 1} of {WIZARD_STEPS.length}
                </span>
                {isLast ? (
                  <button
                    type="button"
                    onClick={onSave}
                    disabled={saving}
                    className="bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-800 disabled:opacity-50"
                  >
                    {saving
                      ? "Saving…"
                      : editing
                        ? "Save changes"
                        : "Create interview"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onNext}
                    className="bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-800"
                  >
                    Continue →
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stepper({
  step,
  onGoTo,
  stepValid,
}: {
  step: number;
  onGoTo: (s: number) => void;
  stepValid: (s: number) => boolean;
}) {
  return (
    <div className="border-b border-gray-100 px-6 sm:px-8 py-4 flex items-center">
      {WIZARD_STEPS.map((label, i) => {
        const done = i < step;
        const current = i === step;
        const reachable = i <= step || [...Array(i).keys()].every((k) => stepValid(k));
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => reachable && onGoTo(i)}
              disabled={!reachable}
              className={`flex items-center gap-2 ${reachable ? "cursor-pointer" : "cursor-not-allowed"}`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  done
                    ? "bg-teal-600 text-white"
                    : current
                      ? "bg-teal-900 text-white ring-4 ring-teal-100"
                      : "bg-gray-200 text-gray-500"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`text-sm hidden sm:block ${
                  current ? "font-semibold text-gray-900" : done ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {label}
              </span>
            </button>
            {i < WIZARD_STEPS.length - 1 && (
              <span
                className={`flex-1 h-0.5 mx-2 sm:mx-3 rounded-full ${
                  done ? "bg-teal-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BasicsStep({
  form,
  setForm,
  jobs,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  jobs: Job[];
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label>Interview title</Label>
        <input
          type="text"
          autoFocus
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="e.g. Skills Lab Leader — Round 1 Screen"
          className={inputCls}
        />
        <Hint>Candidates see this at the top of the interview.</Hint>
      </div>

      <div>
        <Label>Round</Label>
        <div className="flex gap-2">
          {[1, 2, 3].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setForm((f) => ({ ...f, round: r }))}
              className={`flex-1 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                form.round === r
                  ? "border-teal-600 bg-teal-50 text-teal-800"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {roundLabel(r)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Assign to role</Label>
          <select
            value={form.jobId}
            onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
            className={inputCls}
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
          <Label optional>Custom role label</Label>
          <input
            type="text"
            value={form.roleTitle}
            onChange={(e) => setForm((f) => ({ ...f, roleTitle: e.target.value }))}
            placeholder="Overrides the role title in copy"
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}

function QuestionsStep({
  form,
  setQuestion,
  addQuestion,
  removeQuestion,
  moveQuestion,
}: {
  form: FormState;
  setQuestion: (i: number, v: string) => void;
  addQuestion: () => void;
  removeQuestion: (i: number) => void;
  moveQuestion: (i: number, dir: -1 | 1) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-base font-semibold text-gray-900">Questions</h3>
        <span className="text-xs text-gray-400">
          {form.questions.filter((q) => q.prompt.trim()).length} added
        </span>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Candidates record a video answer (with optional written notes) for each.
      </p>

      <div className="space-y-3">
        {form.questions.map((q, i) => (
          <div
            key={i}
            className="group rounded-xl border border-gray-200 bg-white p-3 flex gap-3 hover:border-gray-300 transition-colors"
          >
            <span className="mt-2 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
              {i + 1}
            </span>
            <textarea
              rows={2}
              value={q.prompt}
              onChange={(e) => setQuestion(i, e.target.value)}
              placeholder="Type the question prompt…"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none resize-none"
            />
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => moveQuestion(i, -1)}
                disabled={i === 0}
                className="h-6 w-6 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 text-xs"
                aria-label="Move up"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveQuestion(i, 1)}
                disabled={i === form.questions.length - 1}
                className="h-6 w-6 rounded border border-gray-200 text-gray-400 hover:bg-gray-50 disabled:opacity-30 text-xs"
                aria-label="Move down"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeQuestion(i)}
                disabled={form.questions.length === 1}
                className="h-6 w-6 rounded border border-red-200 text-red-500 hover:bg-red-50 disabled:opacity-30 text-xs"
                aria-label="Remove"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addQuestion}
        className="mt-3 w-full rounded-xl border-2 border-dashed border-gray-200 py-3 text-sm font-medium text-teal-700 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
      >
        + Add question
      </button>
    </div>
  );
}

function SettingsStep({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div className="space-y-5">
      <div>
        <Label optional>Intro shown to candidates</Label>
        <textarea
          rows={4}
          value={form.intro}
          onChange={(e) => setForm((f) => ({ ...f, intro: e.target.value }))}
          placeholder="A short welcome / instructions. Leave blank to use the friendly default."
          className={`${inputCls} resize-none`}
        />
      </div>

      <Toggle
        checked={form.videoRequired}
        onChange={(v) => setForm((f) => ({ ...f, videoRequired: v }))}
        title="Require a video answer for every question"
        desc="Candidates can't continue past a question until they've recorded a video. Leave off to allow written-only answers if their camera fails."
      />
      <Toggle
        checked={form.isActive}
        onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
        title="Active"
        desc="When on, the invitation link works for candidates. Turn off to pause it."
      />
    </div>
  );
}

function ReviewStep({
  form,
  roleLabel,
  cleanCount,
}: {
  form: FormState;
  roleLabel: string;
  cleanCount: number;
}) {
  const questions = form.questions.filter((q) => q.prompt.trim());
  return (
    <div>
      <h3 className="text-base font-semibold text-gray-900 mb-4">Review</h3>
      <div className="border-l-2 border-teal-600 pl-4 mb-5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
            {roundLabel(form.round)}
          </span>
          {form.isActive ? (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
              Live on create
            </span>
          ) : (
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-600">
              Inactive
            </span>
          )}
        </div>
        <p className="text-xl font-semibold text-gray-900 mt-2">
          {form.title.trim() || "Untitled interview"}
        </p>
        <p className="text-sm text-gray-600 mt-1">
          {roleLabel} · {cleanCount} question{cleanCount === 1 ? "" : "s"} ·{" "}
          {form.videoRequired ? "video required" : "video optional"}
        </p>
      </div>

      <div className="space-y-2">
        {questions.map((q, i) => (
          <div key={i} className="flex gap-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
            <span className="text-xs font-bold text-teal-700 mt-0.5">Q{i + 1}</span>
            <p className="text-sm text-gray-700">{q.prompt.trim()}</p>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-5">
        After you create this, you&apos;ll get an unguessable invitation link to
        send to candidates.
      </p>
    </div>
  );
}

function SuccessPanel({
  created,
  editing,
  onCopyLink,
  copiedSlug,
  onCreateAnother,
  onClose,
}: {
  created: Template;
  editing: boolean;
  onCopyLink: (slug: string) => void;
  copiedSlug: string | null;
  onCreateAnother: () => void;
  onClose: () => void;
}) {
  const url = interviewInviteUrl(created.slug);
  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700 text-2xl">
          ✓
        </span>
        <div>
          <h3 className="text-xl font-bold text-gray-900">
            “{created.title}” is ready
          </h3>
          <p className="text-sm text-gray-500">
            {roundLabel(created.round)} ·{" "}
            {created.roleTitle || created.job?.title || "No specific role"}
          </p>
        </div>
      </div>

      <Label>Invitation link</Label>
      <div className="flex items-center gap-2 rounded-xl bg-teal-50 border border-teal-200 px-4 py-3">
        <span className="text-sm text-teal-900 break-all flex-1">{url}</span>
        <button
          type="button"
          onClick={() => onCopyLink(created.slug)}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-teal-700 text-white hover:bg-teal-800 flex-shrink-0"
        >
          {copiedSlug === created.slug ? "Copied!" : "Copy"}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Send this to invited candidates. Responses appear under{" "}
        <strong>Submissions</strong>.
      </p>

      <div className="flex gap-3 mt-7">
        <button
          type="button"
          onClick={onCreateAnother}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 border border-gray-200 hover:bg-gray-50"
        >
          + Create another
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex-1 bg-teal-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-teal-800"
        >
          Done
        </button>
      </div>
    </div>
  );
}

// ---- small UI helpers ----
const inputCls =
  "w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none";

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1.5">
      {children}
      {optional && <span className="text-gray-400 font-normal"> (optional)</span>}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-gray-400 mt-1">{children}</p>;
}

function Toggle({
  checked,
  onChange,
  title,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
        checked ? "border-teal-300 bg-teal-50/60" : "border-gray-200 hover:bg-gray-50"
      }`}
    >
      <span
        className={`mt-0.5 flex h-6 w-10 flex-shrink-0 items-center rounded-full p-0.5 transition-colors ${
          checked ? "bg-teal-600 justify-end" : "bg-gray-300 justify-start"
        }`}
      >
        <span className="h-5 w-5 rounded-full bg-white shadow-sm" />
      </span>
      <span>
        <span className="block text-sm font-medium text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500 mt-0.5">{desc}</span>
      </span>
    </button>
  );
}
