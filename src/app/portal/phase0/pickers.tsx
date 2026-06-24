"use client";

// Searchable pickers shared by the manager's Phase 0 wizard and the developer's
// pre-configuration editor. Moved here verbatim from Phase0Wizard so both render
// states, metros, and languages identically (same values, same widgets), which
// is what makes a developer-seeded answer valid in the manager's questionnaire.

import { useMemo, useState } from "react";
import { Check, Plus, Search, X } from "lucide-react";
import { searchMetros, getMetroProfile, LANGUAGE_CATALOG } from "@/lib/metroData";
import { ASL_VALUE, formatCount } from "@/lib/phase0";

// ---------------------------------------------------------------------------
// Searchable state picker (legal-scope question).
// ---------------------------------------------------------------------------

export function StatePicker({
  options,
  selected,
  onAdd,
  onRemove,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  const [q, setQ] = useState("");
  const sel = new Set(selected);
  const labelFor = (v: string) =>
    options.find((o) => o.value === v)?.label ?? v;
  const query = q.trim().toLowerCase();
  const results = options
    .filter((o) => !sel.has(o.value))
    .filter((o) => !query || o.label.toLowerCase().includes(query));

  return (
    <div>
      {selected.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {selected.map((v) => (
            <span
              key={v}
              className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 py-1 pl-3 pr-1.5 text-sm font-medium text-teal-900 ring-1 ring-inset ring-teal-700/15"
            >
              {labelFor(v)}
              <button
                onClick={() => onRemove(v)}
                className="rounded-full p-0.5 text-teal-700/70 transition hover:bg-teal-700/10 hover:text-teal-900"
                aria-label={`Remove ${labelFor(v)}`}
              >
                <X className="h-3.5 w-3.5" strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" strokeWidth={2} />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search states"
          className="w-full rounded-xl border border-zinc-200 bg-white py-3 pl-10 pr-4 text-[15px] text-ink outline-none transition placeholder:text-ink-faint focus:border-teal-600 focus:ring-1 focus:ring-teal-600"
        />
      </div>

      <div className="mt-1.5 max-h-72 space-y-1.5 overflow-auto">
        {results.map((o) => (
          <button
            key={o.value}
            onClick={() => {
              onAdd(o.value);
              setQ("");
            }}
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-left transition hover:border-teal-500/60 hover:bg-zinc-50"
          >
            <span className="text-[15px] text-ink">{o.label}</span>
            <Plus className="h-4 w-4 text-teal-700" strokeWidth={2} />
          </button>
        ))}
        {results.length === 0 && (
          <p className="px-1 py-2 text-sm text-ink-faint">No match.</p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Searchable footprint picker (metros).
// ---------------------------------------------------------------------------

export function MetroPicker({
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

export function LanguagePicker({
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
