// What AALB already knows about an institution before its manager opens Phase 0.
// A developer sets this (at invite time, or later on the review page); it seeds
// the questionnaire so the manager confirms and adjusts instead of starting from
// a blank slate. Stored in Organization.phase0Config (JSONB, see migration
// 12_org_phase0_config). It is never written through the manager's answer-save
// path: only the developer-gated routes (invitations, preconfigure) write it.

import {
  US_STATES,
  ASL_VALUE,
  AMBITION_OPTIONS,
  CERT_GOAL_OPTIONS,
  TRAINING_GOAL_OPTIONS,
} from "./phase0";
import type { Phase0Answers, Phase0Option } from "./phase0";
import { LANGUAGE_CATALOG, getMetroProfile } from "./metroData";

export type Phase0Config = {
  sector?: string; // SECTOR_OPTIONS value, e.g. "healthcare"
  orgType?: string; // ORG_TYPE_OPTIONS value, e.g. "hospital"
  federalFunding?: "yes" | "no" | "unsure"; // mirrors law.funding values
  states?: string[]; // US_STATES codes, e.g. ["NJ"]
  languages?: string[]; // catalog names + ASL_VALUE, e.g. ["Spanish", "American Sign Language"]
  metros?: string[]; // metro slugs
  // Goal: the institution's target on AALB's scale (see the goal.* questions in
  // phase0.ts). Values match the goal option arrays exactly, so a seeded answer
  // is valid as-is and pre-fills the matching goal.* question.
  ambition?: string; // AMBITION_OPTIONS value
  certification?: string; // CERT_GOAL_OPTIONS value
  training?: string; // TRAINING_GOAL_OPTIONS value
};

// Sector: only healthcare is built today. The list lives here so the editor and
// any future tailoring read it from one place.
export const SECTOR_OPTIONS: Phase0Option[] = [
  { value: "healthcare", label: "Healthcare" },
];

// Care setting / organization type. Tailors copy now and per-setting questions
// in later sections.
export const ORG_TYPE_OPTIONS: Phase0Option[] = [
  { value: "hospital", label: "Hospital" },
  { value: "health_system", label: "Health system" },
  { value: "clinic", label: "Clinic or FQHC" },
  { value: "behavioral", label: "Behavioral health" },
  { value: "telehealth", label: "Telehealth" },
  { value: "other", label: "Other" },
];

// Federal funding. Values match the law.funding question exactly, so a seeded
// answer is valid as-is; labels are tuned for the developer-facing editor.
export const FUNDING_OPTIONS: Phase0Option[] = [
  { value: "yes", label: "Yes (Medicare, Medicaid, or federal grants)" },
  { value: "no", label: "No federal funding" },
  { value: "unsure", label: "Not sure" },
];

// Map the developer's known facts onto the manager's questionnaire answer keys.
// Only facts that correspond to an existing question are seeded. sector/orgType
// have no question (they tailor copy and future sections), so they are not here.
// Keys must match the question ids in phase0.ts exactly.
export function seedAnswersFromConfig(
  config: Phase0Config | null | undefined
): Phase0Answers {
  const out: Phase0Answers = {};
  if (!config || typeof config !== "object") return out;
  if (config.federalFunding) out["law.funding"] = config.federalFunding;
  if (config.states && config.states.length > 0)
    out["law.states"] = [...config.states];
  if (config.languages && config.languages.length > 0)
    out["serve.languages"] = [...config.languages];
  if (config.metros && config.metros.length > 0)
    out["serve.footprint"] = [...config.metros];
  if (config.ambition) out["goal.ambition"] = config.ambition;
  if (config.certification) out["goal.certification"] = config.certification;
  if (config.training) out["goal.training"] = config.training;
  return out;
}

// ---------------------------------------------------------------------------
// Validation (mirrors sanitizeAnswers): whitelist every field against the same
// catalogs the editor uses, so a seeded value is always valid for its widget.
// ---------------------------------------------------------------------------

const STATE_CODES = new Set(US_STATES.map((s) => s.value));
const LANGUAGE_SET = new Set<string>([ASL_VALUE, ...LANGUAGE_CATALOG]);
const SECTOR_VALUES = new Set(SECTOR_OPTIONS.map((o) => o.value));
const ORG_TYPE_VALUES = new Set(ORG_TYPE_OPTIONS.map((o) => o.value));
const FUNDING_VALUES = new Set(["yes", "no", "unsure"]);
const AMBITION_VALUES = new Set(AMBITION_OPTIONS.map((o) => o.value));
const CERT_VALUES = new Set(CERT_GOAL_OPTIONS.map((o) => o.value));
const TRAINING_VALUES = new Set(TRAINING_GOAL_OPTIONS.map((o) => o.value));
const MAX_LIST = 200;

function cleanList(v: unknown, allowed: Set<string>): string[] {
  if (!Array.isArray(v)) return [];
  return Array.from(
    new Set(
      v
        .filter((x): x is string => typeof x === "string")
        .filter((x) => allowed.has(x))
    )
  ).slice(0, MAX_LIST);
}

export function sanitizePhase0Config(input: unknown): Phase0Config {
  const out: Phase0Config = {};
  if (!input || typeof input !== "object") return out;
  const obj = input as Record<string, unknown>;

  if (typeof obj.sector === "string" && SECTOR_VALUES.has(obj.sector))
    out.sector = obj.sector;
  if (typeof obj.orgType === "string" && ORG_TYPE_VALUES.has(obj.orgType))
    out.orgType = obj.orgType;
  if (
    typeof obj.federalFunding === "string" &&
    FUNDING_VALUES.has(obj.federalFunding)
  )
    out.federalFunding = obj.federalFunding as "yes" | "no" | "unsure";

  if (typeof obj.ambition === "string" && AMBITION_VALUES.has(obj.ambition))
    out.ambition = obj.ambition;
  if (
    typeof obj.certification === "string" &&
    CERT_VALUES.has(obj.certification)
  )
    out.certification = obj.certification;
  if (typeof obj.training === "string" && TRAINING_VALUES.has(obj.training))
    out.training = obj.training;

  const states = cleanList(obj.states, STATE_CODES);
  if (states.length > 0) out.states = states;

  const languages = cleanList(obj.languages, LANGUAGE_SET);
  if (languages.length > 0) out.languages = languages;

  // Metros are validated against the dataset; unknown slugs are dropped.
  if (Array.isArray(obj.metros)) {
    const metros = Array.from(
      new Set(
        obj.metros
          .filter((x): x is string => typeof x === "string")
          .filter((slug) => getMetroProfile(slug) != null)
      )
    ).slice(0, MAX_LIST);
    if (metros.length > 0) out.metros = metros;
  }

  return out;
}
