// The kinds of institution document AALB collects in Phase 0. They all share one
// table (app_plan_document, see PlanDocument), discriminated by `kind`. "plan" is
// the language access plan (the original upload); the rest are the interpreter
// evaluation materials collected in the "How you hire and evaluate" section.
// Per-interpreter credential documents are Phase 1 credential verification, not
// here. This registry is the single source of truth for copy and validation,
// shared by the server (upload/send-link routes) and the client (PlanCollect).

export type DocumentKind =
  | "plan"
  | "job_description"
  | "evaluation_material"
  | "qa_record";

type DocumentKindInfo = {
  label: string; // Title-case, for review headings and email subjects
  noun: string; // lower-case, for inline copy ("share your ...")
};

export const DOCUMENT_KIND_INFO: Record<DocumentKind, DocumentKindInfo> = {
  plan: {
    label: "Language access policies",
    noun: "language access policies",
  },
  job_description: {
    label: "Interpreter job description",
    noun: "interpreter job description",
  },
  evaluation_material: {
    label: "Evaluation materials",
    noun: "interpreter evaluation materials",
  },
  qa_record: {
    label: "Quality records",
    noun: "interpreter quality records",
  },
};

export const DOCUMENT_KINDS = Object.keys(
  DOCUMENT_KIND_INFO
) as DocumentKind[];

export const DEFAULT_DOCUMENT_KIND: DocumentKind = "plan";

export function isDocumentKind(x: unknown): x is DocumentKind {
  return typeof x === "string" && x in DOCUMENT_KIND_INFO;
}

// Coerce any input to a valid kind, falling back to the plan (the original,
// and the meaning of every legacy row). Use on every untrusted boundary.
export function coerceDocumentKind(x: unknown): DocumentKind {
  return isDocumentKind(x) ? x : DEFAULT_DOCUMENT_KIND;
}

export function documentKindLabel(x: unknown): string {
  return DOCUMENT_KIND_INFO[coerceDocumentKind(x)].label;
}

export function documentKindNoun(x: unknown): string {
  return DOCUMENT_KIND_INFO[coerceDocumentKind(x)].noun;
}
