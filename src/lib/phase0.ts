// Phase 0 questionnaire: the institutional standards-alignment script and the
// logic that drives it. The output is the institution's Written Standards
// Documentation (the agreement's Step 0 deliverable): the custom rubric every
// interpreter is assessed against, valid two years. Every question sets a real
// parameter in that standard, and the copy says so.
//
// Questions are curated here in code (no builder UI). Question ids are permanent
// keys in the org's phase0Answers JSONB. Never rename an id. Phase A ships the
// framework plus Section 1 (Who you serve); later sections are added without
// touching the engine or the wizard.

import {
  aggregateLanguages,
  type Aggregate,
  type AggregatedLanguage,
} from "./metroData";

export type Phase0Answers = Record<string, unknown>;

export type Phase0Ctx = { orgName: string };

export type Phase0Status =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "finalized";

export type Phase0Option = { value: string; label: string; hint?: string };

export type Phase0QuestionType =
  | "info"
  | "single_select"
  | "multi_select"
  | "short_text"
  | "long_text"
  | "scale";

// A multi_select can render as plain option cards (default) or as a searchable
// picker for one of the large catalogs.
export type Phase0Widget = "metro" | "language" | "plan";

export type Phase0InfoBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "note"; text: string }
  | { kind: "stat"; value: string; label: string }
  | { kind: "expect"; items: { label: string; text: string }[] }
  | {
      kind: "langBars";
      items: { name: string; value: number; note?: string }[];
      caption?: string;
    };

export type Phase0Info = {
  heading: string;
  intro?: string;
  blocks: Phase0InfoBlock[];
};

export type Phase0Question = {
  id: string;
  section: string;
  type: Phase0QuestionType;
  widget?: Phase0Widget;
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
  info?: Phase0Info;
  showIf?: (a: Phase0Answers, ctx: Phase0Ctx) => boolean;
  dynamicOptions?: (a: Phase0Answers, ctx: Phase0Ctx) => Phase0Option[];
  dynamicContent?: (a: Phase0Answers, ctx: Phase0Ctx) => Phase0Info;
};

export type Phase0Section = { id: string; title: string };

// ---------------------------------------------------------------------------
// Shared helpers (config + client + server).
// ---------------------------------------------------------------------------

const numberFmt = new Intl.NumberFormat("en-US");
export function formatCount(n: number): string {
  return numberFmt.format(n);
}

export const ASL_VALUE = "American Sign Language";

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? (v.filter((x) => typeof x === "string") as string[]) : [];
}

export function footprintSlugs(a: Phase0Answers): string[] {
  return asStringArray(a["serve.footprint"]);
}
export function languageList(a: Phase0Answers): string[] {
  return asStringArray(a["serve.languages"]);
}

// The combined language reality across every metro the institution serves.
export function localAggregate(a: Phase0Answers): Aggregate {
  return aggregateLanguages(footprintSlugs(a));
}

// Local languages we suggest on the languages screen (most common first).
export function localSuggestions(a: Phase0Answers, n = 12): AggregatedLanguage[] {
  return localAggregate(a).languages.slice(0, n);
}

// High-prevalence local languages the institution has not added yet. These power
// the live "commonly needed here" prompt on the languages screen: the gap is an
// action (add it), not a dead-end callout.
export function missingLocalLanguages(
  a: Phase0Answers,
  n = 6
): AggregatedLanguage[] {
  const chosen = new Set(languageList(a));
  return localAggregate(a)
    .languages.slice(0, n)
    .filter((l) => !chosen.has(l.name));
}

// Whether the plan.has answer means a document exists to collect and review.
export function hasPlanDocument(a: Phase0Answers): boolean {
  const v = a["plan.has"];
  return v === "current" || v === "outdated";
}

// Whether the plan.has answer means no plan is on file yet (educate + offer help).
export function needsPlanHelp(a: Phase0Answers): boolean {
  const v = a["plan.has"];
  return v === "no" || v === "unsure";
}

// ---------------------------------------------------------------------------
// Sections + questions: getting started, the language access plan, who you serve.
// ---------------------------------------------------------------------------

export const SECTIONS: Phase0Section[] = [
  { id: "start", title: "Getting started" },
  { id: "plan", title: "Your language access policies" },
  { id: "serve", title: "Who you serve" },
];

export const QUESTIONS: Phase0Question[] = [
  {
    id: "intro",
    section: "start",
    type: "info",
    prompt: "Build your Written Standards Documentation",
    dynamicContent: (_a, ctx) => ({
      heading: "Let's set your institutional standards",
      intro: `Phase 0 produces your Written Standards Documentation: the custom benchmark AALB uses to assess every interpreter and bilingual staff member at ${ctx.orgName}, valid for two years.`,
      blocks: [
        {
          kind: "paragraph",
          text: "This is not a generic form. Each answer configures a real part of the assessment: which languages we build a standard for, the clinical settings your team is tested in, the benchmarks you set, and how performance is scored. By the end, you will have defined what qualified means here.",
        },
        {
          kind: "paragraph",
          text: "It saves as you go, so you can step away and come back. A few questions are meant to make explicit what is easy to leave unspoken, like where a bilingual staff member's role should stop. There are no wrong answers.",
        },
        {
          kind: "expect",
          items: [
            { label: "Thorough by design", text: "It asks real questions about real care." },
            { label: "Saved as you go", text: "Step away and pick up where you left off." },
            { label: "Becomes your standard", text: "AALB finalizes it, then your interpreters begin." },
          ],
        },
      ],
    }),
  },
  // -- Section: Your language access policies (the frame, up front) ----------
  {
    id: "plan.frame",
    section: "plan",
    type: "info",
    prompt: "Start with your language access policies",
    info: {
      heading: "First, your language access policies",
      intro:
        "Phase 0 starts with how your institution handles language access today. Reviewing your policies grounds the standard we build with you.",
      blocks: [
        {
          kind: "paragraph",
          text: "Most institutions have something written: a language access policy, interpreter-services procedures, patient-rights language, or a formal plan. Share whatever you have. AALB reviews it alongside the federal and state requirements that apply to you, and uses it to ground your standard. We do not write your policy for you, and this is not an audit.",
        },
        {
          kind: "note",
          text: "This is separate from the languages we assess your staff in. The questions here help us review the policies you already have, or point you in the right direction if they are not written down yet.",
        },
      ],
    },
  },
  {
    id: "plan.has",
    section: "plan",
    type: "single_select",
    required: true,
    prompt: "Do you have written language access policies?",
    whyItMatters:
      "Your policies are the backdrop for everything we set here. Knowing where they stand tells us what to review and where you might want support.",
    options: [
      { value: "current", label: "Yes, and they are current" },
      { value: "outdated", label: "Yes, but they are out of date" },
      { value: "no", label: "No, nothing written yet" },
      { value: "unsure", label: "I am not sure" },
    ],
  },
  {
    id: "plan.link",
    section: "plan",
    type: "short_text",
    widget: "plan",
    required: false,
    showIf: (a) => hasPlanDocument(a),
    prompt: "Share your language access policies with AALB",
    help: "Upload them now, email an upload link to a colleague, or paste a link if they live online. Optional here. If it is easier later, AALB will request them during review.",
    whyItMatters:
      "We review your actual policies, not a summary, so your standard reflects what you have already committed to.",
    placeholder: "https://",
    maxLength: 500,
  },
  {
    id: "plan.educate",
    section: "plan",
    type: "info",
    prompt: "About language access policies",
    showIf: (a) => needsPlanHelp(a),
    info: {
      heading: "Nothing written yet? That is common, and fine.",
      intro:
        "Many institutions we work with start right here. Written language access policies are simply how you commit, on paper, to getting a patient who needs an interpreter the right one.",
      blocks: [
        {
          kind: "paragraph",
          text: "In practice this covers the languages you serve, how staff request an interpreter, how you handle both spoken languages and American Sign Language, and how you avoid leaning on family members or untrained staff. AALB analyzes the federal and state requirements that apply to you and folds them in.",
        },
        {
          kind: "note",
          text: "Not having them written does not slow down your assessment. A few quick questions about how things work today show us what alignment takes, and we can help from there.",
        },
      ],
    },
  },
  {
    id: "plan.todayAccess",
    section: "plan",
    type: "multi_select",
    required: true,
    showIf: (a) => needsPlanHelp(a),
    prompt: "Today, when a patient needs an interpreter, what usually happens?",
    help: "Check all that happen, even the ones you would rather change. An honest picture helps us most.",
    whyItMatters:
      "This is the honest baseline. Qualified interpreters are the expectation, and leaning on family or minors is discouraged, so where you are now tells us how far there is to go.",
    options: [
      { value: "qualified", label: "We bring in a qualified or contracted interpreter" },
      { value: "remote", label: "We use a phone or video interpreting line" },
      { value: "bilingualStaff", label: "A bilingual staff member steps in" },
      { value: "family", label: "A family member or friend interprets" },
      { value: "minors", label: "Sometimes a child or minor interprets" },
      { value: "adhoc", label: "It varies, with no set process" },
    ],
  },
  {
    id: "plan.todayNotices",
    section: "plan",
    type: "single_select",
    required: true,
    showIf: (a) => needsPlanHelp(a),
    prompt: "Do patients see, in their own language, that interpreters are free?",
    whyItMatters:
      "Telling patients, in their language, that free interpreting exists is a basic expectation, and one of the most often missed.",
    options: [
      { value: "posted", label: "Yes, posted and translated into our common languages" },
      { value: "english", label: "We post something, but mostly in English" },
      { value: "none", label: "Not really" },
      { value: "unsure", label: "I am not sure" },
    ],
  },
  {
    id: "plan.barriers",
    section: "plan",
    type: "long_text",
    required: false,
    reflective: true,
    showIf: (a) => needsPlanHelp(a),
    prompt: "What has kept written policies from happening so far?",
    help: "Budget, staffing, unclear ownership, never being asked. Whatever it is.",
    whyItMatters:
      "Knowing the real constraint, not the textbook one, tells us what alignment will actually take here.",
    placeholder: "A sentence is enough.",
    maxLength: 2000,
  },
  {
    id: "plan.help",
    section: "plan",
    type: "single_select",
    required: true,
    showIf: (a) => needsPlanHelp(a),
    prompt: "Would it help to have AALB support your language access policies?",
    whyItMatters:
      "No pressure either way. This just tells us whether to follow up after your standard is set.",
    options: [
      { value: "yes", label: "Yes, we would like help with this" },
      { value: "later", label: "Maybe later" },
      { value: "no", label: "No thank you, we will handle it" },
    ],
  },

  {
    id: "serve.footprint",
    section: "serve",
    type: "multi_select",
    widget: "metro",
    required: true,
    prompt: "Where does your institution provide care?",
    help: "Add every metro area you serve. Search by city or state. Health systems often span several, so add them all.",
    whyItMatters:
      "This sets the language reality your standard has to cover. We use the actual communities you serve to build the right language rubrics, not a generic list.",
  },
  {
    id: "serve.reach",
    section: "serve",
    type: "single_select",
    required: true,
    prompt: "Beyond those areas, how far does your care reach?",
    whyItMatters:
      "Telehealth and regional reach change which languages appear and how much weight your standard puts on video and phone interpreting.",
    options: [
      { value: "local", label: "Those areas cover it" },
      { value: "regional", label: "Across our whole state or region" },
      { value: "national", label: "Nationwide, largely through telehealth" },
    ],
  },
  {
    id: "serve.localPicture",
    section: "serve",
    type: "info",
    prompt: "Your local language landscape",
    showIf: (a) => localAggregate(a).knownSlugs.length > 0,
    dynamicContent: (a) => {
      const agg = localAggregate(a);
      const multi = agg.knownSlugs.length > 1;
      const top = agg.languages.slice(0, 8);
      return {
        heading: multi
          ? "The languages across the areas you serve"
          : "The languages your patients speak",
        intro: `Across the ${multi ? "areas" : "area"} you serve, about ${formatCount(
          agg.lepTotal
        )} residents speak English less than very well. These are the languages they speak most.`,
        blocks: [
          {
            kind: "stat",
            value: formatCount(agg.lepTotal),
            label: "residents who speak English less than very well",
          },
          {
            kind: "langBars",
            items: top.map((l) => ({
              name: l.name,
              value: l.lepCount,
              note: multi && l.metroCount > 1 ? `in ${l.metroCount} of your areas` : undefined,
            })),
            caption:
              "U.S. Census Bureau, ACS 2020 to 2024 5-Year PUMS. Counts are residents with limited English.",
          },
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
    widget: "language",
    required: true,
    prompt: "Which languages does your institution need interpreters for?",
    help: "We have surfaced the most common languages where you serve. Add the ones you need, search the full list for any others, and include American Sign Language if you serve Deaf or hard-of-hearing patients.",
    whyItMatters:
      "We build a separate standard for each language you name. This is the exact list your interpreters will be assessed in, so name every language your patients actually need.",
  },
  {
    id: "serve.asl",
    section: "serve",
    type: "multi_select",
    required: true,
    prompt: "How does your institution provide American Sign Language interpreting today?",
    help: "Select all that apply. Most institutions use more than one.",
    whyItMatters:
      "ASL interpreting carries its own quality risks, especially over video, and the standard is a qualified interpreter, not any single certification. How you deliver it shapes how we assess it.",
    showIf: (a) => languageList(a).includes(ASL_VALUE),
    options: [
      { value: "onsite", label: "On-site, qualified interpreters" },
      { value: "agency", label: "A contracted interpreting agency" },
      { value: "vri", label: "Video remote interpreting (VRI)" },
      { value: "staff", label: "In-house staff who sign" },
      { value: "informal", label: "Informally, through family or untrained staff" },
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
      "Volume tells us whether your standard needs a deep bench or a focused few, and how much rides on getting each encounter right.",
    options: [
      { value: "weekly", label: "A few times a week" },
      { value: "daily", label: "About once a day" },
      { value: "many_daily", label: "Many times a day" },
      { value: "constant", label: "Constantly, across multiple departments" },
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

export function resolveOptions(
  q: Phase0Question,
  a: Phase0Answers,
  ctx: Phase0Ctx
): Phase0Option[] {
  if (q.dynamicOptions) return q.dynamicOptions(a, ctx);
  return q.options ?? [];
}

export function resolveInfo(
  q: Phase0Question,
  a: Phase0Answers,
  ctx: Phase0Ctx
): Phase0Info | null {
  if (q.type !== "info") return null;
  if (q.dynamicContent) return q.dynamicContent(a, ctx);
  return q.info ?? null;
}

export function visibleQuestions(
  a: Phase0Answers,
  ctx: Phase0Ctx
): Phase0Question[] {
  return QUESTIONS.filter((q) => !q.showIf || q.showIf(a, ctx));
}

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

export function missingRequiredIds(a: Phase0Answers, ctx: Phase0Ctx): string[] {
  return visibleQuestions(a, ctx)
    .filter((q) => q.required && q.type !== "info")
    .filter((q) => !isAnswered(q, a))
    .map((q) => q.id);
}

const MAX_TEXT = 5000;
const MAX_SHORT_TEXT = 2000;
const MAX_MULTI = 400; // languages + metros can both be long for big systems

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
        if (typeof v === "string" && v.trim().length > 0)
          out[q.id] = v.slice(0, MAX_SHORT_TEXT);
        break;
      }
      case "long_text": {
        if (typeof v === "string" && v.trim().length > 0)
          out[q.id] = v.slice(0, MAX_TEXT);
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
