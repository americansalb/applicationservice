// Phase 0 questionnaire: the institutional standards-alignment script and the
// logic that drives it. Questions are curated here in code (no builder UI):
// simplicity in authoring, richness in the experience. Each question can carry
// predicates (showIf / dynamicOptions / dynamicContent) so the wizard recomputes
// the visible path on every answer and the conditional flow stays in one place.
//
// Question ids are permanent keys in the org's phase0Answers JSONB. Never rename
// an id. Phase A ships the framework plus Section 1 (Who you serve); later
// sections are added without touching the engine or the wizard.

import {
  getMetroProfile,
  topMetroLanguages,
  METRO_LIST,
  type MetroProfile,
  type MetroLanguage,
} from "./metroData";

export type Phase0Answers = Record<string, unknown>;

// Everything a predicate needs that is not already in the answers. Kept tiny on
// purpose; metro lookups derive from the serve.location answer, not from ctx.
export type Phase0Ctx = {
  orgName: string;
};

export type Phase0Status =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "finalized";

export type Phase0Option = {
  value: string;
  label: string;
  hint?: string;
};

export type Phase0QuestionType =
  | "info"
  | "single_select"
  | "multi_select"
  | "short_text"
  | "long_text"
  | "scale";

// Structured content for info screens, rendered generically by the wizard so
// the config owns the words and the data while the component owns the look.
export type Phase0InfoBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "note"; text: string }
  | { kind: "stat"; value: string; label: string }
  | { kind: "expect"; items: { label: string; text: string }[] }
  | { kind: "metroTable"; profile: MetroProfile; topN: number }
  | { kind: "languageGap"; profile: MetroProfile; missing: MetroLanguage[] };

export type Phase0Info = {
  heading: string;
  intro?: string;
  blocks: Phase0InfoBlock[];
};

export type Phase0Question = {
  id: string;
  section: string;
  type: Phase0QuestionType;
  prompt: string;
  help?: string;
  whyItMatters?: string;
  reflective?: boolean;
  required?: boolean;
  options?: Phase0Option[];
  placeholder?: string;
  maxLength?: number;
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
  // Static info content (use dynamicContent instead when it depends on answers).
  info?: Phase0Info;
  // Predicates, curated in code.
  showIf?: (a: Phase0Answers, ctx: Phase0Ctx) => boolean;
  dynamicOptions?: (a: Phase0Answers, ctx: Phase0Ctx) => Phase0Option[];
  dynamicContent?: (a: Phase0Answers, ctx: Phase0Ctx) => Phase0Info;
};

export type Phase0Section = {
  id: string;
  title: string;
};

// ---------------------------------------------------------------------------
// Helpers shared by config, the wizard (client), and the API (server).
// ---------------------------------------------------------------------------

const numberFmt = new Intl.NumberFormat("en-US");
export function formatCount(n: number): string {
  return numberFmt.format(n);
}

export const ASL_VALUE = "American Sign Language";
export const OTHER_LANGUAGE_VALUE = "Other";
export const LOCATION_OTHER_VALUE = "__other__";

// Sensible default language set when an institution's metro is not in our data.
const NATIONAL_LANGUAGES = [
  "Spanish",
  "Chinese",
  "Vietnamese",
  "Arabic",
  "Tagalog",
  "Korean",
  "Russian",
  "Haitian Creole",
  "Portuguese",
  "French",
];

function selectedLanguages(a: Phase0Answers): string[] {
  const v = a["serve.languages"];
  return Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : [];
}

// The metro a set of answers points at, or null for the fallback path.
export function metroFromAnswers(a: Phase0Answers): MetroProfile | null {
  const loc = a["serve.location"];
  return typeof loc === "string" ? getMetroProfile(loc) : null;
}

// High-prevalence local languages the institution has not named yet. Powers the
// serve.gap screen and its show-if. Educational, not a verdict.
export function computeLanguageGaps(a: Phase0Answers): MetroLanguage[] {
  const metro = metroFromAnswers(a);
  if (!metro) return [];
  const selected = new Set(selectedLanguages(a));
  return topMetroLanguages(metro, 6).filter((l) => !selected.has(l.name));
}

// ---------------------------------------------------------------------------
// Sections + questions. Phase A: Getting started + Who you serve.
// ---------------------------------------------------------------------------

export const SECTIONS: Phase0Section[] = [
  { id: "start", title: "Getting started" },
  { id: "serve", title: "Who you serve" },
];

export const QUESTIONS: Phase0Question[] = [
  {
    id: "intro",
    section: "start",
    type: "info",
    prompt: "Phase 0: Standards alignment",
    dynamicContent: (_a, ctx) => ({
      heading: "Phase 0: Standards alignment",
      intro: `Before we evaluate a single interpreter, we work with you to define what "qualified" means for the patients ${ctx.orgName} serves.`,
      blocks: [
        {
          kind: "paragraph",
          text: "This short questionnaire is where your institution sets the standard. Your answers become the benchmark every candidate is measured against, so the assessment reflects your patients, your settings, and your obligations, not a generic checklist.",
        },
        {
          kind: "paragraph",
          text: "Some questions will be familiar. A few are meant to surface things that are easy to overlook, like the line federal rules draw between a qualified interpreter and a bilingual staff member who helps out. There are no wrong answers. The clearer your picture, the sharper the assessment.",
        },
        {
          kind: "expect",
          items: [
            {
              label: "Around 10 minutes",
              text: "Most institutions finish in one sitting.",
            },
            {
              label: "Saved as you go",
              text: "Step away anytime and pick up where you left off.",
            },
            {
              label: "Finalized by AALB",
              text: "We review your answers, then your interpreters begin.",
            },
          ],
        },
      ],
    }),
  },
  {
    id: "serve.location",
    section: "serve",
    type: "single_select",
    required: true,
    prompt: "Where does your institution primarily provide care?",
    help: "Choose the metro area closest to the community you serve. We use it to show you the local language landscape.",
    whyItMatters:
      "Language need is local. The interpreters a hospital in Miami relies on look nothing like one in Chicago, and your standards should reflect the patients actually at your door.",
    options: [
      ...METRO_LIST.map((m) => ({ value: m.slug, label: m.name })),
      { value: LOCATION_OTHER_VALUE, label: "My area is not listed" },
    ],
  },
  {
    id: "serve.metroProfile",
    section: "serve",
    type: "info",
    prompt: "Your local language landscape",
    showIf: (a) => metroFromAnswers(a) !== null,
    dynamicContent: (a) => {
      const metro = metroFromAnswers(a)!;
      return {
        heading: `Who speaks what in ${metro.name}`,
        intro:
          "Here is the language reality of the community around you, drawn from Census data. These are the patients a language-access program has to be ready for.",
        blocks: [
          {
            kind: "stat",
            value: formatCount(metro.lepTotal),
            label: "residents who speak English less than very well",
          },
          { kind: "metroTable", profile: metro, topN: 8 },
          {
            kind: "note",
            text: "Section 1557 of the Affordable Care Act treats spoken languages and American Sign Language equally. A patient's right to a qualified interpreter does not depend on which language they speak.",
          },
        ],
      };
    },
  },
  {
    id: "serve.languages",
    section: "serve",
    type: "multi_select",
    required: true,
    prompt: "Which of these does your institution regularly serve?",
    help: "Select every language your patients commonly need. Include American Sign Language if you serve Deaf or hard-of-hearing patients.",
    whyItMatters:
      "We build a separate standard for each working language. Naming them now means every interpreter is assessed against the languages your patients actually speak, not a default list.",
    dynamicOptions: (a) => {
      const metro = metroFromAnswers(a);
      const base = metro
        ? topMetroLanguages(metro, 8).map((l) => ({
            value: l.name,
            label: l.name,
            hint: `${formatCount(l.lepCount)} with limited English`,
          }))
        : NATIONAL_LANGUAGES.map((name) => ({ value: name, label: name }));
      return [
        ...base,
        {
          value: ASL_VALUE,
          label: "American Sign Language (ASL)",
          hint: "Counted equally under Section 1557",
        },
        {
          value: OTHER_LANGUAGE_VALUE,
          label: "Another language not listed here",
        },
      ];
    },
  },
  {
    id: "serve.gap",
    section: "serve",
    type: "info",
    prompt: "A note on coverage",
    showIf: (a) => computeLanguageGaps(a).length > 0,
    dynamicContent: (a) => {
      const metro = metroFromAnswers(a)!;
      const missing = computeLanguageGaps(a);
      return {
        heading: "A few common languages are not on your list yet",
        intro: `These are among the most spoken by limited-English residents in ${metro.name}. If any of them show up in your waiting room, it is worth confirming you have a plan.`,
        blocks: [
          { kind: "languageGap", profile: metro, missing },
          {
            kind: "note",
            text: "This is not a verdict, it is a prompt. You know your patients better than any dataset. We only want the standard to account for who actually walks in.",
          },
        ],
      };
    },
  },
  {
    id: "serve.asl",
    section: "serve",
    type: "single_select",
    required: true,
    prompt: "How does your institution provide American Sign Language interpreting today?",
    whyItMatters:
      "ASL has its own credentialing path (RID) and its own quality risks, especially over video. How you deliver it shapes how we assess it.",
    showIf: (a) => selectedLanguages(a).includes(ASL_VALUE),
    options: [
      { value: "onsite_rid", label: "On-site, RID-certified interpreters" },
      { value: "vri", label: "Video remote interpreting (VRI)" },
      { value: "both", label: "Both, depending on the situation" },
      { value: "informal", label: "Informally, through staff or family" },
      { value: "unsure", label: "We are not sure" },
    ],
  },
  {
    id: "serve.volume",
    section: "serve",
    type: "single_select",
    required: true,
    prompt: "How often does your institution need an interpreter?",
    whyItMatters:
      "Volume tells us whether you need a deep bench or a focused few, and how much rides on getting each encounter right.",
    options: [
      { value: "weekly", label: "A few times a week" },
      { value: "daily", label: "About once a day" },
      { value: "many_daily", label: "Many times a day" },
      {
        value: "constant",
        label: "Constantly, across multiple departments",
      },
    ],
  },
];

const QUESTIONS_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]));

export function getQuestion(id: string): Phase0Question | undefined {
  return QUESTIONS_BY_ID.get(id);
}

export function sectionTitle(id: string): string {
  return SECTIONS.find((s) => s.id === id)?.title ?? "";
}

// Options a question offers right now (static or computed from answers).
export function resolveOptions(
  q: Phase0Question,
  a: Phase0Answers,
  ctx: Phase0Ctx
): Phase0Option[] {
  if (q.dynamicOptions) return q.dynamicOptions(a, ctx);
  return q.options ?? [];
}

// Info content a question shows right now (static or computed from answers).
export function resolveInfo(
  q: Phase0Question,
  a: Phase0Answers,
  ctx: Phase0Ctx
): Phase0Info | null {
  if (q.type !== "info") return null;
  if (q.dynamicContent) return q.dynamicContent(a, ctx);
  return q.info ?? null;
}

// The ordered list of questions currently visible for these answers. The wizard
// recomputes this on every change so progress and navigation adapt live.
export function visibleQuestions(
  a: Phase0Answers,
  ctx: Phase0Ctx
): Phase0Question[] {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(a, ctx));
}

// Whether a single question has a usable answer. Info screens are never
// "missing"; they are not answerable.
export function isAnswered(q: Phase0Question, a: Phase0Answers): boolean {
  if (q.type === "info") return true;
  const v = a[q.id];
  switch (q.type) {
    case "single_select":
    case "short_text":
    case "long_text":
      return typeof v === "string" && v.trim().length > 0;
    case "multi_select":
      return Array.isArray(v) && v.length > 0;
    case "scale":
      return typeof v === "number" && Number.isFinite(v);
    default:
      return false;
  }
}

// Visible, required, still-unanswered question ids. Authoritative on the server
// at submit time; also used by the client to gate the submit affordance. Answers
// from branches that are no longer visible are ignored, by construction.
export function missingRequiredIds(a: Phase0Answers, ctx: Phase0Ctx): string[] {
  return visibleQuestions(a, ctx)
    .filter((q) => q.required && q.type !== "info")
    .filter((q) => !isAnswered(q, a))
    .map((q) => q.id);
}

const MAX_TEXT = 5000;
const MAX_SHORT_TEXT = 2000;
const MAX_MULTI = 60;

// Coerce arbitrary client input into a clean answers map: keep only known
// question ids, enforce the right shape per type, and cap sizes. The server
// trusts this over whatever the client sent.
export function sanitizeAnswers(input: unknown): Phase0Answers {
  const out: Phase0Answers = {};
  if (!input || typeof input !== "object") return out;
  const obj = input as Record<string, unknown>;
  for (const q of QUESTIONS) {
    if (q.type === "info") continue;
    if (!(q.id in obj)) continue;
    const v = obj[q.id];
    switch (q.type) {
      case "single_select":
      case "short_text": {
        if (typeof v === "string" && v.trim().length > 0) {
          out[q.id] = v.slice(0, MAX_SHORT_TEXT);
        }
        break;
      }
      case "long_text": {
        if (typeof v === "string" && v.trim().length > 0) {
          out[q.id] = v.slice(0, MAX_TEXT);
        }
        break;
      }
      case "multi_select": {
        if (Array.isArray(v)) {
          const cleaned = Array.from(
            new Set(
              v
                .filter((x): x is string => typeof x === "string")
                .map((x) => x.slice(0, MAX_SHORT_TEXT))
            )
          ).slice(0, MAX_MULTI);
          if (cleaned.length > 0) out[q.id] = cleaned;
        }
        break;
      }
      case "scale": {
        if (typeof v === "number" && Number.isFinite(v)) {
          const min = q.scaleMin ?? 1;
          const max = q.scaleMax ?? 5;
          out[q.id] = Math.min(max, Math.max(min, Math.round(v)));
        }
        break;
      }
    }
  }
  return out;
}
