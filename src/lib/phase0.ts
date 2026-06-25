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
import type { Phase0Config } from "./phase0Config";

export type Phase0Answers = Record<string, unknown>;

// Ctx carries the org name plus what AALB pre-configured about the institution
// (see phase0Config.ts). config lets copy and future sections tailor to the
// sector and setting; the facts that map to questions are seeded into answers
// up front (seedAnswersFromConfig), not read from here at render time.
export type Phase0Ctx = { orgName: string; config?: Phase0Config };

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
export type Phase0Widget = "metro" | "language" | "plan" | "states";

export type Phase0InfoBlock =
  | { kind: "paragraph"; text: string }
  | { kind: "note"; text: string }
  | { kind: "fineprint"; text: string }
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
  // For a document-collection question (widget "plan"): which document kind it
  // collects (documentKinds.ts). Defaults to "plan" (the language access plan).
  documentKind?: string;
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

// Spoken (non-signed) languages the institution named. Drives the spoken-language
// interpreting follow-ups, parallel to the ASL ones gated on ASL_VALUE.
export function spokenLanguages(a: Phase0Answers): string[] {
  return languageList(a).filter((l) => l !== ASL_VALUE);
}
export function hasSpokenLanguages(a: Phase0Answers): boolean {
  return spokenLanguages(a).length > 0;
}

// Whether the institution employs its own interpreters (spoken or signed) -- the
// people AALB assesses. Gates the "how you hire and evaluate" deep-dive: a fully
// outsourced institution has no staff interpreters to look at.
export function hasStaffInterpreters(a: Phase0Answers): boolean {
  const staff = (v: unknown) => v === "staff" || v === "both";
  return staff(a["serve.spokenSource"]) || staff(a["serve.aslSource"]);
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

// The 50 states plus DC, for the legal-scope question (which states' laws AALB
// analyzes). Distinct from the metro footprint, which drives the language picture.
export const US_STATES: Phase0Option[] = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "DC", label: "District of Columbia" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

// Section "What you're aiming for": AALB presents the scale; the institution
// picks its target on it. These three lists back both the questionnaire (the
// goal.* questions below) and the developer pre-config editor, so the seedable
// values and the rendered options never drift. phase0Config.ts imports them to
// build its validation sets; that one-way import (config -> engine) is why the
// lists live here, not there.
export const AMBITION_OPTIONS: Phase0Option[] = [
  {
    value: "compliance",
    label: "Meet the standard required of us",
    hint: "A solid, defensible program that meets the rules that apply to you.",
  },
  {
    value: "beyond",
    label: "Go a step beyond the minimum",
    hint: "Raise the bar past the baseline where it matters most for care.",
  },
  {
    value: "excellence",
    label: "Build a center of excellence",
    hint: "The highest standard, a model others measure against.",
  },
];

export const CERT_GOAL_OPTIONS: Phase0Option[] = [
  {
    value: "required",
    label: "Yes, we want our interpreters nationally certified",
    hint: "Hold it, or actively work toward it.",
  },
  {
    value: "valued",
    label: "A plus, not a requirement",
    hint: "We would value it but will not require it of everyone.",
  },
  {
    value: "no",
    label: "Not a goal for us",
    hint: "Our own standard is enough for what we need.",
  },
  {
    value: "advise",
    label: "Not sure, advise us",
    hint: "Help us decide whether it fits our goals.",
  },
];

export const TRAINING_GOAL_OPTIONS: Phase0Option[] = [
  {
    value: "baseline",
    label: "Everyone meets a recognized training baseline",
    hint: "At least the standard 40-hour medical interpreter training.",
  },
  {
    value: "targeted",
    label: "Training where the assessment finds gaps",
    hint: "Bring specific people up as results show the need.",
  },
  {
    value: "measure",
    label: "Just measure the training they already have",
    hint: "Tell us where our people stand; we will handle training ourselves.",
  },
  {
    value: "advise",
    label: "Not sure, advise us",
    hint: "Help us set the right training expectation.",
  },
];

export const SECTIONS: Phase0Section[] = [
  { id: "start", title: "Getting started" },
  { id: "goal", title: "What you're aiming for" },
  { id: "plan", title: "Your language access policies" },
  { id: "serve", title: "Who you serve" },
  { id: "evaluate", title: "How you hire and evaluate" },
];

export const QUESTIONS: Phase0Question[] = [
  {
    id: "intro",
    section: "start",
    type: "info",
    prompt: "Build your Written Standards Documentation",
    dynamicContent: (_a, ctx) => {
      const cfg = ctx.config;
      const hasSeed = !!(
        cfg &&
        (cfg.federalFunding ||
          (cfg.states?.length ?? 0) > 0 ||
          (cfg.languages?.length ?? 0) > 0 ||
          (cfg.metros?.length ?? 0) > 0)
      );
      // When AALB has pre-filled known facts, tell the manager up front so the
      // pre-selected answers read as a head start to confirm, not a mystery.
      const seedNote: Phase0InfoBlock[] = hasSeed
        ? [
            {
              kind: "note",
              text: `We have already filled in what AALB knows about ${ctx.orgName} from your engagement, like the languages and places you serve. Look it over and change anything that is not right.`,
            },
          ]
        : [];
      return {
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
          ...seedNote,
          {
            kind: "expect",
            items: [
              { label: "Thorough by design", text: "It asks real questions about real care." },
              { label: "Saved as you go", text: "Step away and pick up where you left off." },
              { label: "Becomes your standard", text: "AALB finalizes it, then your interpreters begin." },
            ],
          },
          {
            kind: "fineprint",
            text: "By continuing, you accept our terms of use. This gathers information to set your assessment standard and is not legal advice.",
          },
        ],
      };
    },
  },
  // -- Section: What you're aiming for ---------------------------------------
  // AALB was hired to tell the institution the scale and where their people
  // land on it. goal.scale presents that scale; the next three capture the
  // institution's target on it (their answer, not ours). Each teaches as it
  // asks, and every option is framed so the honest answer is never the lesser
  // one.
  {
    id: "goal.scale",
    section: "goal",
    type: "info",
    prompt: "The scale we measure against",
    dynamicContent: (_a, ctx) => ({
      heading: "The scale we measure against",
      intro: `Before you set your goal, here is the scale every interpreter at ${ctx.orgName} is measured on, and where we draw the line.`,
      blocks: [
        {
          kind: "paragraph",
          text: "We rate interpreting proficiency on a single scale, and our floor for certification is 3+. An interpreter at that level carries a complex clinical conversation accurately and completely, in both directions, under real conditions, without simplifying the medicine or leaving anything out. That is the floor for our stamp of approval.",
        },
        {
          kind: "paragraph",
          text: "Above that floor, two things separate a strong language access program from a great one: whether your interpreters hold national certification, and how much training stands behind them. The next three questions ask how far you want to take each.",
        },
        {
          kind: "note",
          text: "You set the target. We measure your interpreters and tell you exactly where they stand against it.",
        },
      ],
    }),
  },
  {
    id: "goal.ambition",
    section: "goal",
    type: "single_select",
    required: true,
    prompt: "What are you aiming for with language access?",
    help: "There is no wrong answer. Meeting the standard required of you, done well, is a real achievement. Tell us the truth and we calibrate to it.",
    whyItMatters:
      "Your answer sets how high we hold the bar and how we report results back to you. It is the difference between meeting the requirement and setting the example.",
    options: AMBITION_OPTIONS,
  },
  {
    id: "goal.certification",
    section: "goal",
    type: "single_select",
    required: true,
    prompt: "Do you want your interpreters to hold national certification?",
    help: "National certification is a credential from a recognized board, earned by exam, that sits above an internal assessment. For spoken languages that means a CHI or CoreCHI from CCHI, or a CMI from the National Board of Certification for Medical Interpreters. For American Sign Language it means the NIC from the Registry of Interpreters for the Deaf.",
    whyItMatters:
      "Certification is portable and verified by someone other than us. It signals rigor to patients, auditors, and regulators, and it is a clear step beyond an internal benchmark.",
    options: CERT_GOAL_OPTIONS,
  },
  {
    id: "goal.training",
    section: "goal",
    type: "single_select",
    required: true,
    prompt: "How much interpreter training do you want behind your program?",
    help: "The recognized baseline in healthcare is 40 hours of medical interpreter training: ethics, the interpreter's role, medical terminology, and managing a live encounter. It is what turns a bilingual person into an interpreter.",
    whyItMatters:
      "Speaking two languages is not the same as interpreting between them under pressure. Training is what makes interpreting accurate and safe, so how much you want shapes the standard we set.",
    options: TRAINING_GOAL_OPTIONS,
  },
  // -- Section: Your language access policies --------------------------------
  {
    id: "law.funding",
    section: "plan",
    type: "single_select",
    required: true,
    prompt: "Does your institution accept federal funding?",
    help: "Medicare, Medicaid, and federal grants all count. Most hospitals and health systems do.",
    whyItMatters:
      "This sets which laws your standard has to meet: the ADA applies either way, and Section 1557 and Title VI apply if you take federal funding.",
    options: [
      { value: "yes", label: "Yes, including Medicare, Medicaid, or federal grants" },
      { value: "no", label: "No federal funding" },
      { value: "unsure", label: "I am not sure" },
    ],
  },
  {
    id: "law.states",
    section: "plan",
    type: "multi_select",
    widget: "states",
    required: true,
    prompt: "Which states do you provide services in?",
    help: "Pick every state you want included in this review.",
    whyItMatters:
      "State laws can add to the federal baseline, so we analyze the rules in each state you operate in.",
    options: US_STATES,
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
  // -- Spoken-language interpreting (parallel to the ASL block below) ---------
  {
    id: "serve.spokenSource",
    section: "serve",
    type: "single_select",
    required: true,
    showIf: (a) => hasSpokenLanguages(a),
    prompt: "When a patient needs a spoken-language interpreter, who provides it?",
    help: "Think across the spoken languages you named, like Spanish.",
    whyItMatters:
      "We assess the interpreters your institution employs. Knowing whether you rely on your own staff, an outside service, or both tells us who that is.",
    options: [
      { value: "staff", label: "Our own staff interpreters" },
      { value: "outside", label: "An outside agency or interpreting service" },
      { value: "both", label: "Both our staff and an outside service" },
      { value: "varies", label: "It varies, with no set arrangement" },
    ],
  },
  {
    id: "serve.spokenMode",
    section: "serve",
    type: "single_select",
    required: true,
    showIf: (a) => hasSpokenLanguages(a),
    prompt: "How is spoken-language interpreting usually delivered?",
    help: "If it depends on the language or setting, pick the closest.",
    whyItMatters:
      "In-person, phone, and video interpreting place different demands on an interpreter, so we match your standard to how yours actually work.",
    options: [
      { value: "inperson", label: "In person" },
      { value: "phone", label: "Over the phone" },
      { value: "video", label: "By video" },
      { value: "mix", label: "A mix, depending on the situation" },
    ],
  },
  {
    id: "serve.staffLanguages",
    section: "serve",
    type: "multi_select",
    required: true,
    showIf: (a) =>
      hasSpokenLanguages(a) &&
      ["staff", "both"].includes(String(a["serve.spokenSource"])) &&
      spokenLanguages(a).length > 1,
    dynamicOptions: (a) =>
      spokenLanguages(a).map((name) => ({ value: name, label: name })),
    prompt: "Which of these languages do your own staff interpreters cover?",
    help: "Pick the languages where you employ interpreters on staff. We assess those interpreters; an outside service can cover the rest.",
    whyItMatters:
      "These are the spoken languages we build a staff assessment for. The ones your staff cover are the ones your interpreters are tested in.",
  },
  {
    id: "serve.staffCount",
    section: "serve",
    type: "single_select",
    required: true,
    showIf: (a) =>
      hasSpokenLanguages(a) &&
      ["staff", "both"].includes(String(a["serve.spokenSource"])),
    prompt: "How many staff interpreters do you employ for spoken languages?",
    help: "A rough count is fine. Count people on your payroll, not an outside agency's.",
    whyItMatters:
      "Your own spoken-language interpreters are the ones we assess, so we need to know how many there are.",
    options: [
      { value: "1-2", label: "1 to 2" },
      { value: "3-5", label: "3 to 5" },
      { value: "6-10", label: "6 to 10" },
      { value: "11+", label: "11 or more" },
      { value: "unsure", label: "Not sure" },
    ],
  },
  {
    id: "serve.aslMode",
    section: "serve",
    type: "single_select",
    required: true,
    showIf: (a) => languageList(a).includes(ASL_VALUE),
    prompt: "When a patient needs American Sign Language, how is the interpreting delivered?",
    whyItMatters:
      "In-person and video interpreting place different demands on an interpreter, so we match your standard to how yours actually work.",
    options: [
      { value: "inperson", label: "In person" },
      { value: "video", label: "Remotely, by video" },
      { value: "both", label: "Both, depending on the situation" },
      { value: "unsure", label: "We are not sure" },
    ],
  },
  {
    id: "serve.aslSource",
    section: "serve",
    type: "single_select",
    required: true,
    showIf: (a) => languageList(a).includes(ASL_VALUE),
    prompt: "Where do your American Sign Language interpreters come from?",
    whyItMatters:
      "We assess the interpreters your institution employs. Knowing whether you rely on your own staff, an outside service, or both tells us who that is.",
    options: [
      { value: "staff", label: "Our own staff interpreters" },
      { value: "agency", label: "An outside agency or service" },
      { value: "both", label: "Both our staff and an outside service" },
      { value: "varies", label: "It varies, with no set arrangement" },
      { value: "none", label: "We do not have ASL interpreting arranged yet" },
    ],
  },
  {
    id: "serve.aslStaff",
    section: "serve",
    type: "single_select",
    required: true,
    showIf: (a) => languageList(a).includes(ASL_VALUE),
    prompt: "How many of your staff interpret in American Sign Language?",
    help: "A rough count is fine. Count people on your payroll, not an outside agency's.",
    whyItMatters:
      "Your own American Sign Language interpreters are the ones we assess, so we need to know how many there are.",
    options: [
      { value: "none", label: "None" },
      { value: "1-2", label: "1 to 2" },
      { value: "3-5", label: "3 to 5" },
      { value: "6+", label: "6 or more" },
      { value: "unsure", label: "Not sure" },
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

  // -- Section: How you hire and evaluate ------------------------------------
  // The deep-dive into the staff interpreters AALB will assess: the job
  // description they hire against, the materials and process they evaluate with
  // today, and what happens at hire. Shown only when the institution employs
  // interpreters (spoken or ASL). Per-interpreter credential documents are a
  // later phase, not collected here.
  {
    id: "evaluate.intro",
    section: "evaluate",
    type: "info",
    prompt: "How you hire and evaluate interpreters",
    showIf: (a) => hasStaffInterpreters(a),
    dynamicContent: (_a, ctx) => ({
      heading: "Now, the interpreters you employ",
      intro: `You told us ${ctx.orgName} employs its own interpreters. This is where we learn how you bring them on and judge their skill today, so your standard builds on what you already do.`,
      blocks: [
        {
          kind: "paragraph",
          text: "We will ask for your interpreter job description, anything you use to evaluate interpreters, and how hiring works in practice. Share what you have; AALB can request the rest at review. There are no wrong answers, only your honest starting point.",
        },
        {
          kind: "note",
          text: "This is about your process and standards, not any one person's file. Checking individual interpreters' credentials comes later.",
        },
      ],
    }),
  },
  {
    id: "evaluate.jobDesc",
    section: "evaluate",
    type: "short_text",
    widget: "plan",
    documentKind: "job_description",
    required: false,
    showIf: (a) => hasStaffInterpreters(a),
    prompt: "Share the job description you hire interpreters against.",
    help: "Upload it, email a colleague like HR a link, paste a link, or paste the text. Optional here; AALB can request it during review.",
    whyItMatters:
      "Your job description is the bar you set today. We read it to see what you already expect, then build the assessment on top of it.",
    placeholder: "https://",
    maxLength: 500,
  },
  {
    id: "evaluate.proficiencyAtHire",
    section: "evaluate",
    type: "single_select",
    required: true,
    showIf: (a) => hasStaffInterpreters(a),
    prompt: "At hire, how do you check an interpreter's language proficiency?",
    whyItMatters:
      "This tells us whether skill is verified today or assumed, which is exactly the gap our assessment closes.",
    options: [
      { value: "formal", label: "A formal language or interpreting test" },
      { value: "informal", label: "An informal conversation or interview" },
      { value: "credentials", label: "We rely on their resume or credentials" },
      { value: "none", label: "We do not check proficiency at hire" },
      { value: "unsure", label: "I am not sure" },
    ],
  },
  {
    id: "evaluate.credentialAtHire",
    section: "evaluate",
    type: "single_select",
    required: true,
    showIf: (a) => hasStaffInterpreters(a),
    prompt: "Do you require any credential or training to interpret for you?",
    whyItMatters:
      "It shows the floor you set today, and how far it is from the standard you are aiming for.",
    options: [
      { value: "national", label: "National certification" },
      {
        value: "training",
        label: "A medical interpreter training course, like the 40-hour standard",
      },
      { value: "internal", label: "Our own internal training or check" },
      { value: "none", label: "No requirement" },
      { value: "varies", label: "It varies" },
    ],
  },
  {
    id: "evaluate.whoEvaluates",
    section: "evaluate",
    type: "single_select",
    required: true,
    showIf: (a) => hasStaffInterpreters(a),
    prompt: "Today, who judges an interpreter's skill when you hire?",
    help: "Whoever actually decides the person can interpret well enough.",
    whyItMatters:
      "Whether someone who shares the language assesses skill is the difference between a real check and a guess.",
    options: [
      {
        value: "qualified",
        label: "A qualified bilingual evaluator or senior interpreter",
      },
      { value: "managerLang", label: "A manager who speaks the language" },
      {
        value: "managerNoLang",
        label: "A manager who does not speak the language",
      },
      { value: "outside", label: "An outside service" },
      { value: "none", label: "No one evaluates skill formally" },
    ],
  },
  {
    id: "evaluate.ongoing",
    section: "evaluate",
    type: "single_select",
    required: true,
    showIf: (a) => hasStaffInterpreters(a),
    prompt: "After hire, is an interpreter's skill ever checked again?",
    whyItMatters:
      "Skills drift. Knowing whether you re-check tells us if your standard needs an ongoing component.",
    options: [
      { value: "regular", label: "Yes, on a regular schedule" },
      { value: "complaint", label: "Only if there is a complaint" },
      { value: "no", label: "No" },
      { value: "unsure", label: "I am not sure" },
    ],
  },
  {
    id: "evaluate.materials",
    section: "evaluate",
    type: "short_text",
    widget: "plan",
    documentKind: "evaluation_material",
    required: false,
    showIf: (a) => hasStaffInterpreters(a),
    prompt: "Share any rubrics, checklists, or tests you use to evaluate interpreters.",
    help: "Upload, email a link, paste a link, or paste the text. Optional.",
    whyItMatters:
      "If you already evaluate interpreters, we build on your tools instead of replacing them.",
    placeholder: "https://",
    maxLength: 500,
  },
  {
    id: "evaluate.qa",
    section: "evaluate",
    type: "short_text",
    widget: "plan",
    documentKind: "qa_record",
    required: false,
    showIf: (a) => hasStaffInterpreters(a),
    prompt: "Share any interpreter quality or QA records you keep.",
    help: "Upload, email a link, paste a link, or paste the text. Optional.",
    whyItMatters:
      "Your quality records show how interpreting performs in real encounters, not just at hire.",
    placeholder: "https://",
    maxLength: 500,
  },
  {
    id: "evaluate.process",
    section: "evaluate",
    type: "long_text",
    reflective: true,
    required: false,
    showIf: (a) => hasStaffInterpreters(a),
    prompt: "Walk us through what happens when you bring on a new interpreter, from interview to first patient.",
    help: "A few sentences is plenty.",
    whyItMatters:
      "The real process, in your words, often reveals what a form cannot.",
    placeholder: "What happens in the interview, who is involved, what you check.",
    maxLength: 2000,
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
