export const SECTION_KEYS = ["intake"] as const;
export type SectionKey = (typeof SECTION_KEYS)[number];

export const SECTION_META: Record<
  SectionKey,
  { number: number; title: string; description: string; uploadPrompt: string }
> = {
  intake: {
    number: 0,
    title: "Step 0: Institutional Partnership & Standards Alignment",
    description:
      "This intake helps us write your customized Written Standards Documentation (per Article 2.1.1 of our service agreement). Job descriptions are required; everything else is optional. We'll use the clarification thread to ask follow-ups if we need more.",
    uploadPrompt: "Upload any institutional documents you'd like us to review.",
  },
};

export const STATUSES = [
  "Not Started",
  "In Progress",
  "Submitted",
  "Needs Clarification",
  "Approved",
] as const;

export type SectionStatus = (typeof STATUSES)[number];

// Structured asks — all grouped under the single "intake" section
export type AskType = "file" | "text" | "textarea";

export interface Ask {
  id: string; // e.g. "1.1"
  label: string;
  hint?: string;
  type: AskType;
  required?: boolean;
}

export interface AskGroup {
  number: number;
  title: string;
  required?: boolean;
  asks: Ask[];
}

export const ASK_GROUPS: AskGroup[] = [
  {
    number: 1,
    title: "Job Description & Requirements",
    required: true,
    asks: [
      {
        id: "1.1",
        label: "Job description — Spoken Language interpreters",
        hint: "Required. Upload a file or paste the text.",
        type: "file",
        required: true,
      },
      {
        id: "1.2",
        label: "Job description — ASL interpreters",
        hint: "Required if you have ASL interpreters.",
        type: "file",
      },
    ],
  },
  {
    number: 2,
    title: "Institutional Language Access",
    asks: [
      {
        id: "2.1",
        label: "Language access policy",
        hint: "Whatever you have — plan, policy doc, or both.",
        type: "file",
      },
      {
        id: "2.2",
        label: "How staff request interpreter services",
        hint: "SOP, workflow doc, or a short written description.",
        type: "file",
      },
    ],
  },
  {
    number: 3,
    title: "Internal Expectations",
    asks: [
      {
        id: "3.1",
        label: "Beyond the formal JD, what do you expect from your interpreters day-to-day?",
        hint: "Skills, behavior, professionalism, team integration, any unwritten standards.",
        type: "textarea",
      },
      {
        id: "3.2",
        label:
          "What clinical or patient-interaction scenarios shape what 'qualified' means to you?",
        hint: "e.g. trauma activations, behavioral health, pediatric end-of-life, complex consent, L&D.",
        type: "textarea",
      },
    ],
  },
  {
    number: 4,
    title: "Existing Materials",
    asks: [
      {
        id: "4.1",
        label: "Current interpreter interview guide",
        hint: "If you have one — helps us see overlap with our knowledge exam.",
        type: "file",
      },
      {
        id: "4.2",
        label: "Third-party language proficiency vendor: sample report + scoring methodology",
        hint: "Needed to evaluate the Section 2.2 accommodation in the agreement.",
        type: "file",
      },
      {
        id: "4.3",
        label: "Continuing education requirements for interpreters",
        hint: "If any are formally required.",
        type: "file",
      },
    ],
  },
  {
    number: 5,
    title: "Staff Training",
    asks: [
      {
        id: "5.1",
        label:
          "Staff policy or training materials for working with LEP and deaf/HOH patients",
        hint: "Policy doc, training deck, handbook section, LMS export — whatever format.",
        type: "file",
      },
    ],
  },
  {
    number: 6,
    title: "Open Notes",
    asks: [
      {
        id: "6.1",
        label: "Anything else we should know?",
        type: "textarea",
      },
    ],
  },
];

// Flattened list of all ask IDs (for lookups)
export const ALL_ASK_IDS: string[] = ASK_GROUPS.flatMap((g) => g.asks.map((a) => a.id));
