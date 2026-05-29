import crypto from "crypto";

export type InterviewQuestion = { id: string; prompt: string };

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

// Accepts loosely-typed input (from JSON / form bodies) and returns a clean,
// de-duplicated, id'd list of questions. Throws on invalid shape.
export function normalizeQuestions(input: unknown): InterviewQuestion[] {
  if (!Array.isArray(input)) {
    throw new Error("questions must be an array");
  }
  const out: InterviewQuestion[] = [];
  const seen = new Set<string>();
  input.forEach((raw, i) => {
    const prompt =
      typeof raw === "string"
        ? raw
        : raw && typeof raw === "object" && "prompt" in raw
          ? String((raw as { prompt: unknown }).prompt ?? "")
          : "";
    const trimmed = prompt.trim();
    if (!trimmed) return;
    let id =
      raw && typeof raw === "object" && "id" in raw
        ? String((raw as { id: unknown }).id ?? "").trim()
        : "";
    if (!id || seen.has(id)) id = `q${i + 1}`;
    while (seen.has(id)) id = `${id}_`;
    seen.add(id);
    out.push({ id, prompt: trimmed });
  });
  if (out.length === 0) {
    throw new Error("At least one question is required");
  }
  return out;
}

export function roundLabel(round: number): string {
  if (round === 1) return "Round 1";
  if (round === 2) return "Round 2";
  if (round === 3) return "Round 3";
  return `Round ${round}`;
}
