"use client";

// The developer-facing editor for what AALB already knows about an institution.
// Controlled: it holds no state, emits a Phase0Config via onChange. Used in two
// places (the invite modal and the review page), each wiring its own save. It
// reuses the very same pickers the manager sees, so a value set here is always
// valid when it seeds the manager's questionnaire.

import { StatePicker, MetroPicker, LanguagePicker } from "./pickers";
import {
  US_STATES,
  AMBITION_OPTIONS,
  CERT_GOAL_OPTIONS,
  TRAINING_GOAL_OPTIONS,
} from "@/lib/phase0";
import {
  SECTOR_OPTIONS,
  ORG_TYPE_OPTIONS,
  FUNDING_OPTIONS,
  type Phase0Config,
} from "@/lib/phase0Config";

// Stable identity so the LanguagePicker's suggestion memo does not rerun: the
// config editor has no footprint-derived suggestions, only the ASL quick-add.
const NO_SUGGESTIONS: string[] = [];

const selectClass =
  "block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-sm text-ink shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";

export default function Phase0ConfigFields({
  value,
  onChange,
}: {
  value: Phase0Config;
  onChange: (next: Phase0Config) => void;
}) {
  const states = value.states ?? [];
  const languages = value.languages ?? [];
  const metros = value.metros ?? [];

  const update = (patch: Partial<Phase0Config>) =>
    onChange({ ...value, ...patch });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sector">
          <select
            value={value.sector ?? ""}
            onChange={(e) => update({ sector: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">Not set</option>
            {SECTOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Care setting">
          <select
            value={value.orgType ?? ""}
            onChange={(e) => update({ orgType: e.target.value || undefined })}
            className={selectClass}
          >
            <option value="">Not set</option>
            {ORG_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Federal funding">
          <select
            value={value.federalFunding ?? ""}
            onChange={(e) =>
              update({
                federalFunding: (e.target.value ||
                  undefined) as Phase0Config["federalFunding"],
              })
            }
            className={selectClass}
          >
            <option value="">Not set</option>
            {FUNDING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="States served" hint="Pre-fills the legal-scope question.">
        <StatePicker
          options={US_STATES}
          selected={states}
          onAdd={(v) =>
            update({ states: states.includes(v) ? states : [...states, v] })
          }
          onRemove={(v) => update({ states: states.filter((x) => x !== v) })}
        />
      </Field>

      <Field
        label="Languages"
        hint="Pre-fills the languages the manager confirms. They can change these freely."
      >
        <LanguagePicker
          selected={languages}
          suggestions={NO_SUGGESTIONS}
          missingCount={0}
          onToggle={(name) =>
            update({
              languages: languages.includes(name)
                ? languages.filter((x) => x !== name)
                : [...languages, name],
            })
          }
          onAdd={(name) =>
            update({
              languages: languages.includes(name)
                ? languages
                : [...languages, name],
            })
          }
          onRemove={(name) =>
            update({ languages: languages.filter((x) => x !== name) })
          }
        />
      </Field>

      <Field
        label="Metro areas served"
        hint="Pre-fills where you provide care, which builds the local language picture."
      >
        <MetroPicker
          selected={metros}
          onAdd={(slug) =>
            update({ metros: metros.includes(slug) ? metros : [...metros, slug] })
          }
          onRemove={(slug) =>
            update({ metros: metros.filter((x) => x !== slug) })
          }
        />
      </Field>

      <div className="border-t border-zinc-200/70 pt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
          Goal
        </p>
        <p className="mt-0.5 mb-3 text-xs text-ink-faint">
          What they are aiming for on our scale. Pre-fills the goal questions;
          the manager can change them.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Ambition">
            <select
              value={value.ambition ?? ""}
              onChange={(e) => update({ ambition: e.target.value || undefined })}
              className={selectClass}
            >
              <option value="">Not set</option>
              {AMBITION_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="National certification">
            <select
              value={value.certification ?? ""}
              onChange={(e) =>
                update({ certification: e.target.value || undefined })
              }
              className={selectClass}
            >
              <option value="">Not set</option>
              {CERT_GOAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Training">
            <select
              value={value.training ?? ""}
              onChange={(e) => update({ training: e.target.value || undefined })}
              className={selectClass}
            >
              <option value="">Not set</option>
              {TRAINING_GOAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold text-ink-soft">{label}</p>
      {hint && <p className="mt-0.5 mb-2 text-xs text-ink-faint">{hint}</p>}
      <div className={hint ? "" : "mt-2"}>{children}</div>
    </div>
  );
}
