"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ArrowRight, LogOut } from "lucide-react";
import {
  visibleQuestions,
  resolveOptions,
  resolveInfo,
  isAnswered,
  sectionTitle,
  formatCount,
  type Phase0Answers,
  type Phase0Question,
  type Phase0Info,
  type Phase0InfoBlock,
} from "@/lib/phase0";

const AUTOSAVE_DEBOUNCE_MS = 1200;

export default function Phase0Wizard({
  orgName,
  initialAnswers,
  initialStatus,
}: {
  orgName: string;
  initialAnswers: Phase0Answers;
  initialStatus: string;
}) {
  const router = useRouter();
  const ctx = useMemo(() => ({ orgName }), [orgName]);

  const [answers, setAnswers] = useState<Phase0Answers>(initialAnswers || {});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");

  // Autosave plumbing. We save from refs (not closure state) and serialize
  // in-flight saves so a fast typist never races two writes; a queued change is
  // coalesced and flushed once the active save returns.
  const answersRef = useRef<Phase0Answers>(initialAnswers || {});
  const dirtyRef = useRef(false);
  const savingRef = useRef(false);
  const pendingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSave = useCallback(async (): Promise<void> => {
    if (savingRef.current) {
      pendingRef.current = true;
      return;
    }
    if (!dirtyRef.current) return;
    savingRef.current = true;
    dirtyRef.current = false;
    setSaveState("saving");
    try {
      const res = await fetch("/api/portal/phase0", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: answersRef.current, submit: false }),
      });
      if (!res.ok) throw new Error("save failed");
      setSaveState("saved");
    } catch {
      dirtyRef.current = true; // re-mark so the next attempt retries it
      setSaveState("error");
    } finally {
      savingRef.current = false;
      if (pendingRef.current) {
        pendingRef.current = false;
        void doSave();
      }
    }
  }, []);

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void doSave(), AUTOSAVE_DEBOUNCE_MS);
  }, [doSave]);

  const flushSave = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (dirtyRef.current) void doSave();
  }, [doSave]);

  // Persist on tab close / navigation away if anything is unsaved.
  useEffect(() => {
    const handler = () => {
      if (!dirtyRef.current) return;
      try {
        fetch("/api/portal/phase0", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: answersRef.current, submit: false }),
          keepalive: true,
        });
      } catch {
        // best effort
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const steps = useMemo(
    () => visibleQuestions(answers, ctx),
    [answers, ctx]
  );

  // Keep the index in range if a branch change shortens the path.
  useEffect(() => {
    if (index > steps.length - 1) setIndex(Math.max(0, steps.length - 1));
  }, [steps.length, index]);

  const clampedIndex = Math.min(index, Math.max(0, steps.length - 1));
  const current = steps[clampedIndex];

  const applyAnswers = useCallback(
    (next: Phase0Answers) => {
      setAnswers(next);
      answersRef.current = next;
      setError("");
      scheduleSave();
    },
    [scheduleSave]
  );

  const onSelect = useCallback(
    (q: Phase0Question, value: string) => {
      const prev = answersRef.current;
      let next: Phase0Answers = { ...prev, [q.id]: value };
      // Changing the metro invalidates the language and ASL picks that were
      // seeded from it, so clear them rather than leave stale selections.
      if (q.id === "serve.location" && prev["serve.location"] !== value) {
        delete next["serve.languages"];
        delete next["serve.asl"];
      }
      applyAnswers(next);
    },
    [applyAnswers]
  );

  const onToggle = useCallback(
    (q: Phase0Question, value: string) => {
      const prev = answersRef.current;
      const arr = Array.isArray(prev[q.id])
        ? [...(prev[q.id] as string[])]
        : [];
      const at = arr.indexOf(value);
      if (at >= 0) arr.splice(at, 1);
      else arr.push(value);
      applyAnswers({ ...prev, [q.id]: arr });
    },
    [applyAnswers]
  );

  const onText = useCallback(
    (q: Phase0Question, value: string) => {
      applyAnswers({ ...answersRef.current, [q.id]: value });
    },
    [applyAnswers]
  );

  const onScale = useCallback(
    (q: Phase0Question, value: number) => {
      applyAnswers({ ...answersRef.current, [q.id]: value });
    },
    [applyAnswers]
  );

  const finish = useCallback(async () => {
    setFinishing(true);
    dirtyRef.current = true; // force a final flush of the latest answers
    await doSave();
    router.push("/portal");
    router.refresh();
  }, [doSave, router]);

  const goNext = useCallback(() => {
    if (!current) return;
    if (
      current.type !== "info" &&
      current.required &&
      !isAnswered(current, answersRef.current)
    ) {
      setError(
        current.type === "multi_select"
          ? "Select at least one to continue."
          : "Please answer to continue."
      );
      return;
    }
    setError("");
    flushSave();
    if (clampedIndex >= steps.length - 1) {
      void finish();
      return;
    }
    setIndex(clampedIndex + 1);
  }, [current, clampedIndex, steps.length, flushSave, finish]);

  const goBack = useCallback(() => {
    setError("");
    flushSave();
    if (clampedIndex > 0) setIndex(clampedIndex - 1);
  }, [clampedIndex, flushSave]);

  const exit = useCallback(() => {
    flushSave();
    router.push("/portal");
  }, [flushSave, router]);

  if (!current) return null;

  const nonInfo = steps.filter((s) => s.type !== "info");
  const qPos =
    current.type !== "info"
      ? nonInfo.findIndex((s) => s.id === current.id) + 1
      : 0;
  const isFirst = clampedIndex === 0;
  const isLast = clampedIndex === steps.length - 1;
  const pct = Math.round(((clampedIndex + 1) / steps.length) * 100);
  const nextLabel = isLast
    ? "Save and finish"
    : current.id === "intro"
      ? "Begin"
      : "Continue";

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Progress bar */}
      <div className="fixed inset-x-0 top-0 z-30 h-1 bg-sand-200/80">
        <div
          className="h-full bg-teal-600 transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Header */}
      <header className="flex items-center justify-between gap-4 px-5 pt-6 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-semibold tracking-tight text-ink">
            AALB
          </span>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-teal-700 sm:inline">
            Phase 0
          </span>
        </div>
        <div className="flex items-center gap-4">
          <SaveStatus state={saveState} />
          <button
            onClick={exit}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-faint transition hover:text-ink"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.75} />
            <span className="hidden sm:inline">Save and exit</span>
          </button>
        </div>
      </header>

      {/* The question */}
      <main className="flex flex-1 items-start justify-center px-5 py-10 sm:items-center sm:py-14">
        <div key={current.id} className="phase0-in w-full max-w-2xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
            {sectionTitle(current.section)}
            {qPos > 0 && (
              <span className="text-ink-faint">
                {"  ·  "}Question {qPos} of {nonInfo.length}
              </span>
            )}
          </p>

          {current.type === "info"
            ? renderInfo(resolveInfo(current, answers, ctx))
            : renderQuestion()}

          {error && (
            <p className="mt-4 text-sm font-medium text-clay-600">{error}</p>
          )}
        </div>
      </main>

      {/* Footer navigation */}
      <footer className="sticky bottom-0 border-t border-sand-200/70 bg-sand-50/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4 sm:px-0">
          {isFirst ? (
            <span />
          ) : (
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-sand-100 hover:text-ink"
            >
              <ChevronLeft className="h-4 w-4" strokeWidth={2} />
              Back
            </button>
          )}
          <button
            onClick={goNext}
            disabled={finishing}
            className="inline-flex items-center gap-2 rounded-lg bg-teal-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950 disabled:opacity-60"
          >
            {finishing ? "Saving..." : nextLabel}
            {!finishing && <ArrowRight className="h-4 w-4" strokeWidth={2} />}
          </button>
        </div>
      </footer>
    </div>
  );

  function renderQuestion() {
    const q = current;
    return (
      <div>
        <h1 className="font-display text-[26px] font-semibold leading-snug tracking-tight text-ink sm:text-[30px]">
          {q.prompt}
        </h1>
        {q.help && (
          <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">
            {q.help}
          </p>
        )}

        <div className="mt-6">{renderControl(q)}</div>

        {q.whyItMatters && (
          <div className="mt-6 rounded-xl bg-sand-100/70 px-4 py-3.5 ring-1 ring-inset ring-sand-200/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">
              Why we ask
            </p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              {q.whyItMatters}
            </p>
          </div>
        )}
      </div>
    );
  }

  function renderControl(q: Phase0Question) {
    if (q.type === "single_select") {
      const opts = resolveOptions(q, answers, ctx);
      const value = answers[q.id];
      return (
        <div className="space-y-2.5">
          {opts.map((o) => {
            const selected = value === o.value;
            return (
              <OptionRow
                key={o.value}
                label={o.label}
                hint={o.hint}
                selected={selected}
                multi={false}
                onClick={() => onSelect(q, o.value)}
              />
            );
          })}
        </div>
      );
    }

    if (q.type === "multi_select") {
      const opts = resolveOptions(q, answers, ctx);
      const arr = Array.isArray(answers[q.id])
        ? (answers[q.id] as string[])
        : [];
      return (
        <div className="space-y-2.5">
          {opts.map((o) => (
            <OptionRow
              key={o.value}
              label={o.label}
              hint={o.hint}
              selected={arr.includes(o.value)}
              multi
              onClick={() => onToggle(q, o.value)}
            />
          ))}
        </div>
      );
    }

    if (q.type === "short_text") {
      return (
        <input
          type="text"
          value={(answers[q.id] as string) ?? ""}
          onChange={(e) => onText(q, e.target.value)}
          placeholder={q.placeholder}
          maxLength={q.maxLength}
          className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
        />
      );
    }

    if (q.type === "long_text") {
      return (
        <textarea
          value={(answers[q.id] as string) ?? ""}
          onChange={(e) => onText(q, e.target.value)}
          placeholder={q.placeholder}
          maxLength={q.maxLength}
          rows={5}
          className="w-full rounded-xl border border-sand-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition placeholder:text-ink-faint focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
        />
      );
    }

    if (q.type === "scale") {
      const min = q.scaleMin ?? 1;
      const max = q.scaleMax ?? 5;
      const value = answers[q.id];
      const nums = Array.from({ length: max - min + 1 }, (_, i) => min + i);
      return (
        <div>
          <div className="flex gap-2">
            {nums.map((n) => {
              const selected = value === n;
              return (
                <button
                  key={n}
                  onClick={() => onScale(q, n)}
                  className={`flex h-12 flex-1 items-center justify-center rounded-xl border text-base font-semibold transition ${
                    selected
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-sand-200 bg-white text-ink-soft hover:border-teal-500/60"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {(q.scaleMinLabel || q.scaleMaxLabel) && (
            <div className="mt-2 flex justify-between text-xs text-ink-faint">
              <span>{q.scaleMinLabel}</span>
              <span>{q.scaleMaxLabel}</span>
            </div>
          )}
        </div>
      );
    }

    return null;
  }
}

function OptionRow({
  label,
  hint,
  selected,
  multi,
  onClick,
}: {
  label: string;
  hint?: string;
  selected: boolean;
  multi: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3.5 text-left transition ${
        selected
          ? "border-teal-600 bg-teal-50/70 ring-1 ring-teal-600"
          : "border-sand-200 bg-white hover:border-teal-500/60 hover:bg-sand-50"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        {hint && (
          <span className="mt-0.5 block text-[13px] text-ink-faint">{hint}</span>
        )}
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center border transition ${
          multi ? "rounded-md" : "rounded-full"
        } ${
          selected
            ? "border-teal-600 bg-teal-600 text-white"
            : "border-sand-300 bg-white"
        }`}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

function SaveStatus({
  state,
}: {
  state: "idle" | "saving" | "saved" | "error";
}) {
  if (state === "idle") return null;
  if (state === "saving")
    return <span className="text-xs text-ink-faint">Saving...</span>;
  if (state === "error")
    return <span className="text-xs text-clay-600">Could not save</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
      <Check className="h-3.5 w-3.5 text-teal-600" strokeWidth={2.5} />
      Saved
    </span>
  );
}

// ---------------------------------------------------------------------------
// Info-screen rendering (welcome, metro profile, coverage gap).
// ---------------------------------------------------------------------------

function renderInfo(info: Phase0Info | null) {
  if (!info) return null;
  return (
    <div>
      <h1 className="font-display text-[26px] font-semibold leading-snug tracking-tight text-ink sm:text-[32px]">
        {info.heading}
      </h1>
      {info.intro && (
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft sm:text-base">
          {info.intro}
        </p>
      )}
      <div className="mt-6 space-y-4">
        {info.blocks.map((b, i) => (
          <InfoBlock key={i} block={b} />
        ))}
      </div>
    </div>
  );
}

function InfoBlock({ block }: { block: Phase0InfoBlock }) {
  switch (block.kind) {
    case "paragraph":
      return (
        <p className="text-[15px] leading-relaxed text-ink-soft">
          {block.text}
        </p>
      );
    case "note":
      return (
        <div className="rounded-xl border-l-2 border-teal-600 bg-teal-50/50 px-4 py-3 text-sm leading-relaxed text-ink-soft">
          {block.text}
        </div>
      );
    case "stat":
      return (
        <div className="rounded-2xl border border-sand-200/80 bg-white p-5 shadow-card">
          <div className="font-display text-4xl font-semibold leading-none text-ink">
            {block.value}
          </div>
          <div className="mt-1.5 text-sm text-ink-soft">{block.label}</div>
        </div>
      );
    case "expect":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {block.items.map((it) => (
            <div
              key={it.label}
              className="rounded-xl border border-sand-200/80 bg-white p-4 shadow-card"
            >
              <div className="text-sm font-semibold text-ink">{it.label}</div>
              <div className="mt-1 text-[13px] leading-snug text-ink-faint">
                {it.text}
              </div>
            </div>
          ))}
        </div>
      );
    case "metroTable": {
      const langs = block.profile.languages.slice(0, block.topN);
      const max = Math.max(...langs.map((l) => l.lepCount), 1);
      return (
        <div className="rounded-2xl border border-sand-200/80 bg-white p-5 shadow-card">
          <div className="space-y-2.5">
            {langs.map((l) => {
              const w = Math.max(5, Math.round((l.lepCount / max) * 100));
              return (
                <div key={l.name} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 truncate text-sm font-medium text-ink sm:w-32">
                    {l.name}
                  </div>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-sand-100">
                    <div
                      className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-teal-700 to-teal-500"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                  <div className="w-24 shrink-0 text-right text-sm tabular-nums text-ink-soft sm:w-28">
                    {formatCount(l.lepCount)}
                    <span className="ml-1 text-xs text-ink-faint">
                      {l.lepRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 border-t border-sand-200/70 pt-3 text-[11px] text-ink-faint">
            {block.profile.source}. Share is the percent of each language&rsquo;s
            speakers who report limited English.
          </p>
        </div>
      );
    }
    case "languageGap":
      return (
        <div className="flex flex-wrap gap-2.5">
          {block.missing.map((l) => (
            <div
              key={l.name}
              className="rounded-xl border border-clay-500/25 bg-clay-100/60 px-4 py-3"
            >
              <div className="text-sm font-semibold text-ink">{l.name}</div>
              <div className="mt-0.5 text-xs text-ink-soft">
                {formatCount(l.lepCount)} with limited English
              </div>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
