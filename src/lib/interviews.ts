import crypto from "crypto";

// ---------------------------------------------------------------------------
// Granular interview question model.
//
// Historically a question was just `{ id, prompt }` and every answer was a
// video (gated globally by `InterviewTemplate.videoRequired`). The richer model
// below adds a per-question media `type` and capture controls (takes, time
// limits, prep countdown, review). Legacy questions normalise to identical
// behaviour: type "video", optional, unlimited takes, no timers, review on.
// ---------------------------------------------------------------------------

export type QuestionType =
  | "video"
  | "audio"
  | "text"
  | "multiple_choice"
  | "rating";

export const QUESTION_TYPES: QuestionType[] = [
  "video",
  "audio",
  "text",
  "multiple_choice",
  "rating",
];

export function isMediaType(type: QuestionType): boolean {
  return type === "video" || type === "audio";
}

export type InterviewQuestion = {
  id: string;
  prompt: string;
  type: QuestionType;
  helpText: string | null;
  // When true the candidate must answer before continuing. For media questions
  // the template-level `videoRequired` flag also forces a recording.
  required: boolean;
  // Recording controls (media questions only). 0 means "no limit".
  maxTakes: number; // re-record allowance; 1 = single take
  maxDurationSec: number; // auto-stop the recording at this length
  prepTimeSec: number; // countdown shown before recording auto-starts
  allowReview: boolean; // can the candidate review / re-record before submit
  // Choice / rating questions.
  options: string[]; // multiple_choice
  ratingScale: number; // rating, e.g. 5 → a 1–5 scale
};

export const DEFAULT_QUESTION: Omit<InterviewQuestion, "id" | "prompt"> = {
  type: "video",
  helpText: null,
  required: false,
  maxTakes: 0,
  maxDurationSec: 0,
  prepTimeSec: 0,
  allowReview: true,
  options: [],
  ratingScale: 5,
};

// Session-level capture configuration, stored in `InterviewTemplate.config`.
export type InterviewConfig = {
  // "per_question": candidate records a separate clip per question (default).
  // "continuous": one recording runs across the whole interview.
  captureMode: "per_question" | "continuous";
  // How many times a single invited candidate may submit this round.
  maxSubmissions: number;
};

export const DEFAULT_INTERVIEW_CONFIG: InterviewConfig = {
  captureMode: "per_question",
  maxSubmissions: 1,
};

// Max upload size per recorded answer. Mirrors the legacy Round 2 endpoint.
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024; // 200 MB per video

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function slugifyTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// Invitation links are unguessable: a readable slug plus random entropy so the
// link itself acts as the access token (interviews are invitation-only).
export function generateInterviewSlug(title: string): string {
  const base = slugifyTitle(title) || "interview";
  const random = crypto.randomBytes(6).toString("hex"); // 48 bits
  return `${base}-${random}`;
}

// Per-candidate, per-round access token. Pure random (no readable part) since
// it gates a specific candidate's progression through the pipeline.
export function generateAccessToken(): string {
  return crypto.randomBytes(24).toString("base64url"); // 192 bits
}

export type InterviewFormat = "self_paced" | "live";

export function isLive(format: string | null | undefined): boolean {
  return format === "live";
}

function toQuestionType(raw: unknown): QuestionType {
  return typeof raw === "string" && (QUESTION_TYPES as string[]).includes(raw)
    ? (raw as QuestionType)
    : "video";
}

// Clamp a loosely-typed numeric field to a non-negative integer.
function toCount(raw: unknown, fallback = 0): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function toStringList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => String(x ?? "").trim())
    .filter((x) => x.length > 0)
    .slice(0, 12);
}

// Accepts loosely-typed input (from JSON / form bodies) and returns a clean,
// de-duplicated, id'd list of rich questions. Legacy `{id, prompt}` and plain
// string entries are upgraded with default capture settings. Throws on an
// invalid shape or an empty result.
export function normalizeQuestions(input: unknown): InterviewQuestion[] {
  if (!Array.isArray(input)) {
    throw new Error("questions must be an array");
  }
  const out: InterviewQuestion[] = [];
  const seen = new Set<string>();
  input.forEach((raw, i) => {
    const obj =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
    const prompt =
      typeof raw === "string"
        ? raw
        : obj && "prompt" in obj
          ? String(obj.prompt ?? "")
          : "";
    const trimmed = prompt.trim();
    if (!trimmed) return;

    let id = obj && "id" in obj ? String(obj.id ?? "").trim() : "";
    if (!id || seen.has(id)) id = `q${i + 1}`;
    while (seen.has(id)) id = `${id}_`;
    seen.add(id);

    const type = toQuestionType(obj?.type);
    const helpRaw = obj && "helpText" in obj ? String(obj.helpText ?? "").trim() : "";
    const ratingScale = Math.min(10, Math.max(2, toCount(obj?.ratingScale, 5)));

    out.push({
      id,
      prompt: trimmed,
      type,
      helpText: helpRaw || null,
      required: obj?.required === true,
      maxTakes: toCount(obj?.maxTakes, 0),
      maxDurationSec: toCount(obj?.maxDurationSec, 0),
      prepTimeSec: toCount(obj?.prepTimeSec, 0),
      allowReview: obj?.allowReview !== false,
      options: type === "multiple_choice" ? toStringList(obj?.options) : [],
      ratingScale,
    });
  });
  if (out.length === 0) {
    throw new Error("At least one question is required");
  }
  return out;
}

// Normalises session-level capture config from JSON / form bodies, falling back
// to safe defaults so legacy templates (which have no `config`) keep working.
export function normalizeInterviewConfig(input: unknown): InterviewConfig {
  const obj =
    input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const captureMode =
    obj.captureMode === "continuous" ? "continuous" : "per_question";
  const maxRaw = Number(obj.maxSubmissions);
  const maxSubmissions =
    Number.isFinite(maxRaw) && maxRaw >= 1 ? Math.min(20, Math.floor(maxRaw)) : 1;
  return { captureMode, maxSubmissions };
}

export function roundLabel(round: number): string {
  if (round === 1) return "Round 1";
  if (round === 2) return "Round 2";
  if (round === 3) return "Round 3";
  return `Round ${round}`;
}
