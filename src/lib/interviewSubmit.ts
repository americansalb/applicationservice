// Server-side collection of interview answers from a multipart submission.
// Shared by the standalone (/api/interviews/[slug]/submit) and gated
// (/api/access/[token]/submit) endpoints so the two stay in lockstep as the
// question model grows richer (media/text/choice/rating, continuous capture).

import { uploadVideoToDrive } from "@/lib/googleDrive";
import {
  MAX_VIDEO_BYTES,
  isMediaType,
  type InterviewQuestion,
} from "@/lib/interviews";

export type CollectedMedia = { fileId: string; webViewLink: string };

export type CollectedAnswers = {
  answers: Record<string, string>;
  videoUrls: Record<string, CollectedMedia>;
};

// A failure carrying the HTTP status the route should return.
export class SubmitError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "SubmitError";
  }
}

const SESSION_KEY = "__session__";

async function upload(
  file: File,
  slug: string,
  safeName: string,
  key: string,
  fallbackMime: string
): Promise<CollectedMedia> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new SubmitError(413, "A recording exceeds the 200 MB limit.");
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop() || "webm";
  try {
    return await uploadVideoToDrive({
      filename: `${slug}_${safeName}_${key}_${Date.now()}.${ext}`,
      mimeType: file.type || fallbackMime,
      buffer,
    });
  } catch (e) {
    throw new SubmitError(500, e instanceof Error ? e.message : "Drive upload failed");
  }
}

export async function collectInterviewAnswers(
  form: FormData,
  questions: InterviewQuestion[],
  opts: {
    videoRequired: boolean;
    captureMode: "per_question" | "continuous";
    slug: string;
    fullName: string;
  }
): Promise<CollectedAnswers> {
  const { videoRequired, captureMode, slug, fullName } = opts;
  const continuous = captureMode === "continuous";
  const safeName = fullName.replace(/[^a-zA-Z0-9_-]+/g, "_") || "candidate";

  const answers: Record<string, string> = {};
  const videoUrls: Record<string, CollectedMedia> = {};

  for (const q of questions) {
    const text = String(form.get(`answer_${q.id}`) || "").trim();
    if (text) answers[q.id] = text;

    const isMedia = isMediaType(q.type);
    const label = q.prompt.slice(0, 40);
    const file = form.get(`video_${q.id}`);
    const hasMedia = file instanceof File && file.size > 0;

    if (isMedia && continuous) {
      // The whole session is captured once (handled after the loop).
      continue;
    }
    if (isMedia) {
      const mediaRequired =
        q.required || (q.type === "video" && videoRequired);
      if (mediaRequired && !hasMedia) {
        throw new SubmitError(400, `A ${q.type} answer is required for "${label}…".`);
      }
      if (hasMedia) {
        videoUrls[q.id] = await upload(
          file as File,
          slug,
          safeName,
          q.id,
          q.type === "audio" ? "audio/webm" : "video/webm"
        );
      }
    } else if (q.required && !text) {
      throw new SubmitError(400, `An answer is required for "${label}…".`);
    }
  }

  if (continuous) {
    const sessionFile = form.get(`video_${SESSION_KEY}`);
    const hasSession = sessionFile instanceof File && sessionFile.size > 0;
    const sessionExpected =
      videoRequired || questions.some((q) => isMediaType(q.type) && q.required);
    if (hasSession) {
      videoUrls[SESSION_KEY] = await upload(
        sessionFile as File,
        slug,
        safeName,
        "session",
        "video/webm"
      );
    } else if (sessionExpected) {
      throw new SubmitError(400, "A recording of your session is required.");
    }
  }

  if (Object.keys(answers).length === 0 && Object.keys(videoUrls).length === 0) {
    throw new SubmitError(
      400,
      "Please answer at least one question before submitting."
    );
  }

  return { answers, videoUrls };
}
