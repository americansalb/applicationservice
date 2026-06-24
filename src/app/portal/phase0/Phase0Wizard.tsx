"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ArrowRight, LogOut, Search, X, Plus } from "lucide-react";
import PlanCollect from "./PlanCollect";
import {
  visibleQuestions,
  resolveOptions,
  resolveInfo,
  isAnswered,
  sectionTitle,
  formatCount,
  footprintSlugs,
  languageList,
  localSuggestions,
  missingLocalLanguages,
  ASL_VALUE,
  type Phase0Answers,
  type Phase0Question,
  type Phase0Info,
  type Phase0InfoBlock,
} from "@/lib/phase0";
import {
  searchMetros,
  getMetroProfile,
  LANGUAGE_CATALOG,
} from "@/lib/metroData";

const AUTOSAVE_DEBOUNCE_MS = 1200;

export default function Phase0Wizard({
  orgName,
  initialAnswers,
  planDoc = null,
}: {
  orgName: string;
  initialAnswers: Phase0Answers;
  planDoc?: string | null;
}) {
  const router = useRouter();
  const ctx = useMemo(() => ({ orgName }), [orgName]);

  const [answers, setAnswers] = useState<Phase0Answers>(initialAnswers || {});
  const [index, setIndex] = useState(0);
  const [error, setError] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

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
      dirtyRef.current = true;
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

  const steps = useMemo(() => visibleQuestions(answers, ctx), [answers, ctx]);

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

  const asArr = (v: unknown): string[] =>
    Array.isArray(v) ? (v as string[]) : [];

  const onSelect = useCallback(
    (q: Phase0Question, value: string) => {
      applyAnswers({ ...answersRef.current, [q.id]: value });
    },
    [applyAnswers]
  );
  const addMulti = useCallback(
    (qid: string, value: string) => {
      const prev = answersRef.current;
      const arr = asArr(prev[qid]);
      if (!arr.includes(value)) applyAnswers({ ...prev, [qid]: [...arr, value] });
    },
    [applyAnswers]
  );
  const removeMulti = useCallback(
    (qid: string, value: string) => {
      const prev = answersRef.current;
      applyAnswers({ ...prev, [qid]: asArr(prev[qid]).filter((x) => x !== value) });
    },
    [applyAnswers]
  );
  const toggleMulti = useCallback(
    (qid: string, value: string) => {
      if (asArr(answersRef.current[qid]).includes(value)) removeMulti(qid, value);
      else addMulti(qid, value);
    },
    [addMulti, removeMulti]
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
    dirtyRef.current = true;
    await doSave();
    router.push("/portal");
    router.refresh();
  }, [doSave, router]);

  const goNext = useCallback(() => {
    if (!current) return;
    if (current.type !== "info" && current.required && !isAnswered(current, answersRef.current)) {
      setError(
        current.type === "multi_select"
          ? "Add at least one to continue."
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
  const qPos = current.type !== "info" ? nonInfo.findIndex((s) => s.id === current.id) + 1 : 0;
  const isFirst = clampedIndex === 0;
  const isLast = clampedIndex === steps.length - 1;
  const pct = Math.round(((clampedIndex + 1) / steps.length) * 100);
  const nextLabel = isLast ? "Save and finish" : current.id === "intro" ? "Begin" : "Continue";

  return (
    <div className="relative flex min-h-screen flex-col bg-zinc-50">
      <div className="fixed inset-x-0 top-0 z-30 h-1 bg-zinc-200/80">
        <div className="h-full bg-teal-600 transition-all duration-500 ease-out" style={{ width: `${pct}%` }} />
      </div>

      <header className="flex items-center justify-between gap-4 px-5 pt-6 sm:px-8">
        <div className="flex items-center gap-3">
          <span className="font-display text-lg font-semibold tracking-tight text-ink">AALB</span>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.16em] text-teal-700 sm:inline">
            Standards alignment
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

          {current.type === "info" ? renderInfo(resolveInfo(current, answers, ctx)) : renderQuestion()}

          {error && <p className="mt-4 text-sm font-medium text-clay-600">{error}</p>}
        </div>
      </main>

      <footer className="sticky bottom-0 border-t border-zinc-200/70 bg-zinc-50/85 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4 sm:px-0">
          {isFirst ? (
            <span />
          ) : (
            <button
              onClick={goBack}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-ink-soft transition hover:bg-zinc-100 hover:text-ink"
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
        {q.help && <p className="mt-2.5 text-[15px] leading-relaxed text-ink-soft">{q.help}</p>}
        <div className="mt-6">{renderControl(q)}</div>
        {q.whyItMatters && (
          <div className="mt-6 rounded-xl bg-zinc-100/70 px-4 py-3.5 ring-1 ring-inset ring-zinc-200/70">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-700">Why we ask</p>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">{q.whyItMatters}</p>
          </div>
        )}
      </div>
    );
  }

  function renderControl(q: Phase0Question) {
    if (q.widget === "plan") {
      return (
        <PlanCollect
          orgName={orgName}
          initialDoc={planDoc}
          linkValue={(answers[q.id] as string) ?? ""}
          onLinkChange={(v) => onText(q, v)}
        />
      );
    }
    if (q.type === "multi_select" && q.widget === "states") {
      const opts = resolveOptions(q, answers, ctx);
      const arr = asArr(answers[q.id]);
      return (
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => {
            const on = arr.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggleMulti(q.id, o.value)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                  on
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-zinc-200 bg-white text-ink-soft hover:border-teal-500/60"
                }`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      );
    }
    if (q.type === "multi_select" && q.widget === "metro") {
      return (
        <MetroPicker
          selected={footprintSlugs(answers)}
          onAdd={(slug) => addMulti(q.id, slug)}
          onRemove={(slug) => removeMulti(q.id, slug)}
        />
      );
    }
    if (q.type === "multi_select" && q.widget === "language") {
      return (
        <LanguagePicker
          selected={languageList(answers)}
          suggestions={localSuggestions(answers).map((l) => l.name)}
          missingCount={missingLocalLanguages(answers).length}
          onToggle={(name) => toggleMulti(q.id, name)}
          onAdd={(name) => addMulti(q.id, name)}
          onRemove={(name) => removeMulti(q.id, name)}
        />
      );
    }
    if (q.type === "single_select") {
      const opts = resolveOptions(q, answers, ctx);
      const value = answers[q.id];
      return (
        <div className="space-y-2.5">
          {opts.map((o) => (
            <OptionRow
              key={o.value}
              label={o.label}
              hint={o.hint}
              selected={value === o.value}
              multi={false}
              onClick={() => onSelect(q, o.value)}
            />
          ))}
        </div>
      );
    }
    if (q.type === "multi_select") {
      const opts = resolveOptions(q, answers, ctx);
      const arr = asArr(answers[q.id]);
      return (
        <div className="space-y-2.5">
          {opts.map((o) => (
            <OptionRow
              key={o.value}
              label={o.label}
              hint={o.hint}
              selected={arr.includes(o.value)}
              multi
              onClick={() => toggleMulti(q.id, o.value)}
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
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
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
          className="w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-[15px] leading-relaxed text-ink outline-none transition placeholder:text-ink-faint focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
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
            {nums.map((n) => (
              <button
                key={n}
                onClick={() => onScale(q, n)}
                className={`flex h-12 flex-1 items-center justify-center rounded-xl border text-base font-semibold transition ${
                  value === n
                    ? "border-teal-600 bg-teal-600 text-white"
                    : "border-zinc-200 bg-white text-ink-soft hover:border-teal-500/60"
                }`}
              >
                {n}
              </button>
            ))}
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

// ---------------------------------------------------------------------------
// Searchable footprint picker (metros).
// ---------------------------------------------------------------------------

function MetroPicker({
  selected,
  onAdd,
  onRemove,
}: {
  selected: string[];
  onAdd: (slug: string) => void;
  onRemove: (slug: string) => void;
}) {
  const [q, setQ] = useState("");
  const sel = new Set(selected);
  const results = searchMetros(q, 8).filter((m) => !sel.has(m.slug));

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selected.map((slug) => {
            const name = getMetroProfile(slug)?.name ?? slug;
            return (
              <span
                key={slug}
                className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 py-1 pl-3 pr-1.5 text-sm font-medium text-teal-900 ring-1 ring-inset ring-teal-700/15"
              >
                {name}
                <button
                  onClick={() => onRemove(slug)}
                  className="rounded-full p-0.5 text-teal-700/70 transition hover:bg-teal-700/10 hover:text-teal-900"
                  aria-label={`Remove ${name}`}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" strokeWidth={2} />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by city or state, like Houston or NJ"
          className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
        />
      </div>

      <p className="mt-2 px-1 text-xs text-ink-faint">
        {q.trim() ? "Matching metro areas" : "Largest metro areas, or search above"}
      </p>
      <div className="mt-1.5 max-h-72 space-y-1.5 overflow-auto">
        {results.map((m) => (
          <button
            key={m.slug}
            onClick={() => {
              onAdd(m.slug);
              setQ("");
            }}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-left transition hover:border-teal-500/60 hover:bg-zinc-50"
          >
            <span className="text-[15px] text-ink">{m.name}</span>
            <span className="flex items-center gap-2 text-xs text-ink-faint">
              {m.lepTotal != null && <span>{formatCount(m.lepTotal)} LEP</span>}
              <Plus className="h-4 w-4 text-teal-700" strokeWidth={2} />
            </span>
          </button>
        ))}
        {results.length === 0 && (
          <p className="px-1 py-2 text-sm text-ink-faint">
            No match. Try a nearby larger city, or continue and tell us in the notes.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Searchable language picker, with local suggestions and an inline gap prompt.
// ---------------------------------------------------------------------------

function LanguagePicker({
  selected,
  suggestions,
  missingCount,
  onToggle,
  onAdd,
  onRemove,
}: {
  selected: string[];
  suggestions: string[];
  missingCount: number;
  onToggle: (name: string) => void;
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const [q, setQ] = useState("");
  const sel = new Set(selected);

  // Local suggestions plus ASL (not in ACS spoken data), de-duplicated.
  const suggestionRow = useMemo(() => {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const n of [...suggestions, ASL_VALUE]) {
      if (!seen.has(n)) {
        seen.add(n);
        out.push(n);
      }
    }
    return out;
  }, [suggestions]);

  const catalog = useMemo(() => [ASL_VALUE, ...LANGUAGE_CATALOG], []);
  const query = q.trim().toLowerCase();
  const results = query
    ? catalog.filter((n) => n.toLowerCase().includes(query) && !sel.has(n)).slice(0, 8)
    : [];

  return (
    <div>
      <div className="mb-4">
        <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          Your languages {selected.length > 0 && `(${selected.length})`}
        </p>
        {selected.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selected.map((name) => (
              <span
                key={name}
                className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 py-1 pl-3 pr-1.5 text-sm font-medium text-teal-900 ring-1 ring-inset ring-teal-700/15"
              >
                {name}
                <button
                  onClick={() => onRemove(name)}
                  className="rounded-full p-0.5 text-teal-700/70 transition hover:bg-teal-700/10 hover:text-teal-900"
                  aria-label={`Remove ${name}`}
                >
                  <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">None yet. Add from the suggestions or search below.</p>
        )}
      </div>

      {suggestionRow.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Common where you serve
          </p>
          {missingCount > 0 && (
            <p className="mb-2 text-sm text-clay-700">
              A few common local languages are not on your list yet. Tap to add them.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            {suggestionRow.map((name) => {
              const on = sel.has(name);
              return (
                <button
                  key={name}
                  onClick={() => onToggle(name)}
                  className={`inline-flex items-center gap-1.5 rounded-full border py-1.5 pl-3 pr-3 text-sm font-medium transition ${
                    on
                      ? "border-teal-600 bg-teal-50 text-teal-900"
                      : "border-zinc-300 bg-white text-ink-soft hover:border-teal-500/60 hover:bg-zinc-50"
                  }`}
                >
                  {on ? (
                    <Check className="h-3.5 w-3.5 text-teal-700" strokeWidth={2.5} />
                  ) : (
                    <Plus className="h-3.5 w-3.5 text-ink-faint" strokeWidth={2.5} />
                  )}
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" strokeWidth={2} />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search all languages, like Pashto or Karen"
          className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
        />
      </div>
      {results.length > 0 && (
        <div className="mt-1.5 max-h-60 space-y-1.5 overflow-auto">
          {results.map((name) => (
            <button
              key={name}
              onClick={() => {
                onAdd(name);
                setQ("");
              }}
              className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-left transition hover:border-teal-500/60 hover:bg-zinc-50"
            >
              <span className="text-[15px] text-ink">{name}</span>
              <Plus className="h-4 w-4 text-teal-700" strokeWidth={2} />
            </button>
          ))}
        </div>
      )}
      {query && results.length === 0 && (
        <p className="mt-2 px-1 text-sm text-ink-faint">No language matches that search.</p>
      )}
    </div>
  );
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
          : "border-zinc-200 bg-white hover:border-teal-500/60 hover:bg-zinc-50"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-[13px] text-ink-faint">{hint}</span>}
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center border transition ${
          multi ? "rounded-md" : "rounded-full"
        } ${selected ? "border-teal-600 bg-teal-600 text-white" : "border-zinc-300 bg-white"}`}
      >
        {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
    </button>
  );
}

function SaveStatus({ state }: { state: "idle" | "saving" | "saved" | "error" }) {
  if (state === "idle") return null;
  if (state === "saving") return <span className="text-xs text-ink-faint">Saving...</span>;
  if (state === "error") return <span className="text-xs text-clay-600">Could not save</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
      <Check className="h-3.5 w-3.5 text-teal-600" strokeWidth={2.5} />
      Saved
    </span>
  );
}

// ---------------------------------------------------------------------------
// Info-screen rendering (welcome, local language picture).
// ---------------------------------------------------------------------------

function renderInfo(info: Phase0Info | null) {
  if (!info) return null;
  return (
    <div>
      <h1 className="font-display text-[26px] font-semibold leading-snug tracking-tight text-ink sm:text-[32px]">
        {info.heading}
      </h1>
      {info.intro && (
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft sm:text-base">{info.intro}</p>
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
      return <p className="text-[15px] leading-relaxed text-ink-soft">{block.text}</p>;
    case "note":
      return (
        <div className="rounded-xl border-l-2 border-teal-600 bg-teal-50/50 px-4 py-3 text-sm leading-relaxed text-ink-soft">
          {block.text}
        </div>
      );
    case "stat":
      return (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card">
          <div className="font-display text-4xl font-semibold leading-none text-ink">{block.value}</div>
          <div className="mt-1.5 text-sm text-ink-soft">{block.label}</div>
        </div>
      );
    case "expect":
      return (
        <div className="grid gap-3 sm:grid-cols-3">
          {block.items.map((it) => (
            <div key={it.label} className="rounded-xl border border-zinc-200/80 bg-white p-4 shadow-card">
              <div className="text-sm font-semibold text-ink">{it.label}</div>
              <div className="mt-1 text-[13px] leading-snug text-ink-faint">{it.text}</div>
            </div>
          ))}
        </div>
      );
    case "langBars": {
      const max = Math.max(...block.items.map((l) => l.value), 1);
      return (
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card">
          <div className="space-y-2.5">
            {block.items.map((l) => {
              const w = Math.max(5, Math.round((l.value / max) * 100));
              return (
                <div key={l.name} className="flex items-center gap-3">
                  <div className="w-24 shrink-0 truncate text-sm font-medium text-ink sm:w-36">{l.name}</div>
                  <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-zinc-100">
                    <div
                      className="absolute inset-y-0 left-0 rounded-md bg-gradient-to-r from-teal-700 to-teal-500"
                      style={{ width: `${w}%` }}
                    />
                  </div>
                  <div className="w-28 shrink-0 text-right text-sm tabular-nums text-ink-soft">
                    {formatCount(l.value)}
                    {l.note && <span className="ml-1 text-xs text-ink-faint">{l.note}</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {block.caption && (
            <p className="mt-4 border-t border-zinc-200/70 pt-3 text-[11px] text-ink-faint">{block.caption}</p>
          )}
        </div>
      );
    }
    default:
      return null;
  }
}
