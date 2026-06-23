// Phase 0 questionnaire: the institutional standards-alignment script and the
// logic that drives it. The output is the institution's Written Standards
// Documentation (the agreement's Step 0 deliverable): the custom rubric every
// interpreter is assessed against, valid two years. Every question sets a real
// parameter in that standard, and the copy says so.
//
// Two language ideas live here and are kept deliberately separate, because
// conflating them reads as scope creep:
//   1. Assessment scope (assess.languages): the languages AALB assesses the
//      institution's own staff in. Contracted, named in advance, one rubric each.
//   2. Community language picture (serve.*): advisory input to the language
//      access plan AALB reviews. It informs the plan, it is not a test roster.
// The language access plan is introduced up front, as the frame, so the
// community questions visibly serve the plan review.
//
// Questions are curated here in code (no builder UI). Question ids are permanent
// keys in the org's phase0Answers JSONB. Sections currently shipped: getting
// started, language access plan, who you serve, what we assess. Later sections
// are added without touching the engine or the wizard.

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
export type Phase0Widget = "metro" | "language";

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

// The languages AALB will assess the institution's staff in: the contracted
// scope, named here. Distinct from the community language picture, which is
// advisory input to the language access plan review.
export function assessedLanguages(a: Phase0Answers): string[] {
  return asStringArray(a["assess.languages"]);
}

// The combined community language reality across every metro the institution
// serves. Advisory: it informs the language access plan, not the assessment scope.
export function localAggregate(a: Phase0Answers): Aggregate {
  return aggregateLanguages(footprintSlugs(a));
}

// Local languages offered as quick adds on the assessment-scope screen (most
// common first). Suggestions the institution may choose from, never a roster it
// is expected to cover.
export function localSuggestions(a: Phase0Answers, n = 12): AggregatedLanguage[] {
  return localAggregate(a).languages.slice(0, n);
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
// Sections + questions. Shipped: getting started, language access plan, who you
// serve (advisory), what we assess (the contracted scope). Later sections add
// settings, who interprets today, expectations, and compliance.
// ---------------------------------------------------------------------------

export const SECTIONS: Phase0Section[] = [
  { id: "start", title: "Getting started" },
  { id: "plan", title: "Your language access plan" },
  { id: "serve", title: "Who you serve" },
  { id: "assess", title: "What we assess" },
];

export const QUESTIONS: Phase0Question[] = [
  {
    id: "intro",
    section: "start",
    type: "info",
    prompt: "Build your Written Standards Documentation",
    dynamicContent: (_a, ctx) => ({
      heading: "Let's set the standard for your interpreters",
      intro: `Phase 0 is where we set the standard for ${ctx.orgName}. It does two things: it defines exactly how AALB assesses your interpreters, and it reviews your language access plan against the federal rules. The result is your Written Standards Documentation, valid for two years.`,
      blocks: [
        {
          kind: "paragraph",
          text: "Two things stay separate here, and it is worth saying up front. The languages we assess your staff in are the ones you contracted for, named by you. The wider set of languages your community speaks is something we look at to review your language access plan. It is not a list we test your staff against.",
        },
        {
          kind: "paragraph",
          text: "It takes about ten minutes and saves as you go. A few questions are meant to make explicit what is easy to leave unspoken. There are no wrong answers.",
        },
        {
          kind: "expect",
          items: [
            { label: "About ten minutes", text: "Most institutions finish in one sitting." },
            { label: "Saved as you go", text: "Step away and pick up where you left off." },
            { label: "Becomes your standard", text: "AALB reviews it, then your interpreters begin." },
          ],
        },
      ],
    }),
  },

  // -- Section: Your language access plan (the frame, up front) --------------
  {
    id: "plan.frame",
    section: "plan",
    type: "info",
    prompt: "Start with your language access plan",
    info: {
      heading: "First, your language access plan",
      intro:
        "Federal rules expect health systems to have a written language access plan. Reviewing yours is part of Phase 0.",
      blocks: [
        {
          kind: "paragraph",
          text: "Section 1557 of the Affordable Care Act, Title VI of the Civil Rights Act, and the Americans with Disabilities Act all expect a written plan for how you communicate with patients who have limited English, or who are Deaf or hard of hearing. AALB reviews your plan as part of setting your standard. We do not write it for you, and this is not an audit.",
        },
        {
          kind: "note",
          text: "This is separate from the languages we assess your staff in. The questions here help us review the plan you already have, or point you in the right direction if you do not have one yet.",
        },
      ],
    },
  },
  {
    id: "plan.has",
    section: "plan",
    type: "single_select",
    required: true,
    prompt: "Do you have a written language access plan?",
    whyItMatters:
      "Your plan is the backdrop for everything we set here. Knowing where it stands tells us what to review and where you might want support.",
    options: [
      { value: "current", label: "Yes, and it is current" },
      { value: "outdated", label: "Yes, but it is out of date" },
      { value: "no", label: "No, not yet" },
      { value: "unsure", label: "I am not sure" },
    ],
  },
  {
    id: "plan.link",
    section: "plan",
    type: "short_text",
    required: false,
    showIf: (a) => hasPlanDocument(a),
    prompt: "Where can AALB find your plan?",
    help: "If your plan lives online, an intranet page, a shared drive, or a PDF link, paste the link here. If it is an internal document, leave this blank. AALB will request the file when we review your responses.",
    whyItMatters:
      "We review the actual plan, not a summary, so your standard reflects what you have already committed to.",
    placeholder: "https://",
    maxLength: 500,
  },
  {
    id: "plan.educate",
    section: "plan",
    type: "info",
    prompt: "About language access plans",
    showIf: (a) => needsPlanHelp(a),
    info: {
      heading: "No plan yet? That is common, and fixable.",
      intro:
        "Many institutions we work with start right here. A language access plan is simply your written commitment to how a patient who needs an interpreter actually gets one.",
      blocks: [
        {
          kind: "paragraph",
          text: "At a minimum, a plan names the languages you serve, how staff request an interpreter, how you handle both spoken languages and American Sign Language, and how you avoid leaning on family members or untrained bilingual staff. Section 1557 expects this in writing.",
        },
        {
          kind: "note",
          text: "Not having one does not slow down your assessment. We note it, set your standard, and can help you build the plan separately.",
        },
      ],
    },
  },
  {
    id: "plan.help",
    section: "plan",
    type: "single_select",
    required: true,
    showIf: (a) => needsPlanHelp(a),
    prompt: "Would it help to have AALB support your language access plan?",
    whyItMatters:
      "No pressure either way. This just tells us whether to follow up after your standard is set.",
    options: [
      { value: "yes", label: "Yes, we would like help with this" },
      { value: "later", label: "Maybe later" },
      { value: "no", label: "No thank you, we will handle it" },
    ],
  },

  // -- Section: Who you serve (advisory, for the plan review) ----------------
  {
    id: "serve.footprint",
    section: "serve",
    type: "multi_select",
    widget: "metro",
    required: true,
    prompt: "Where does your institution provide care?",
    help: "Add every metro area you serve. Search by city or state. Health systems often span several, so add them all.",
    whyItMatters:
      "This shows the languages your community actually speaks, which is what we review your language access plan against. It is advisory. The languages we assess your staff in come later, and are yours to choose.",
  },
  {
    id: "serve.reach",
    section: "serve",
    type: "single_select",
    required: true,
    prompt: "Beyond those areas, how far does your care reach?",
    whyItMatters:
      "Telehealth and regional reach widen the community your plan has to account for, and add weight to video and phone interpreting.",
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
        )} residents speak English less than very well. This is here to inform your language access plan, not to set what we assess.`,
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
            text: "This picture is advisory. It informs your language access plan and your obligations under Section 1557, which treats spoken languages and American Sign Language equally. It is not the list of languages we assess your staff in. You choose that next.",
          },
        ],
      };
    },
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

  // -- Section: What we assess (the contracted assessment scope) -------------
  {
    id: "assess.frame",
    section: "assess",
    type: "info",
    prompt: "The languages we assess",
    info: {
      heading: "Now, the languages we assess",
      intro:
        "This is your assessment scope: the languages AALB tests your staff in. It is the part you contracted for, and it is yours to set.",
      blocks: [
        {
          kind: "paragraph",
          text: "We build a separate standard, a full rubric, for each language you name here. Your interpreters are assessed against those rubrics and nothing else. Name the languages your own staff actually interpret in.",
        },
        {
          kind: "note",
          text: "This is deliberately separate from your community's language picture. Your community may speak many languages. You decide which ones your staff are assessed in. Adding a language expands the assessment, so choose the ones that match the staff you want verified.",
        },
      ],
    },
  },
  {
    id: "assess.languages",
    section: "assess",
    type: "multi_select",
    widget: "language",
    required: true,
    prompt: "Which languages should AALB assess your staff in?",
    help: "Add each language your staff interpret in and that you want verified. We have surfaced the common languages where you serve as quick adds. Include American Sign Language if your staff interpret for Deaf or hard-of-hearing patients.",
    whyItMatters:
      "Each language becomes its own rubric in your standard. This is the exact list your interpreters are assessed in, so it should match the staff and languages you are putting forward, not every language in your community.",
  },
  {
    id: "assess.asl",
    section: "assess",
    type: "single_select",
    required: true,
    prompt: "How does your institution provide American Sign Language interpreting today?",
    whyItMatters:
      "ASL has its own credentialing path (RID) and its own quality risks, especially over video. How you deliver it shapes how we assess it.",
    showIf: (a) => assessedLanguages(a).includes(ASL_VALUE),
    options: [
      { value: "onsite_rid", label: "On-site, RID-certified interpreters" },
      { value: "vri", label: "Video remote interpreting (VRI)" },
      { value: "both", label: "Both, depending on the situation" },
      { value: "informal", label: "Informally, through staff or family" },
      { value: "unsure", label: "We are not sure" },
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
