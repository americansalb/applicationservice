"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  roundLabel,
  isMediaType,
  DEFAULT_INTERVIEW_CONFIG,
  type InterviewQuestion,
  type InterviewConfig,
} from "@/lib/interviews";

type BasicInfo = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  yearsExp: string;
};

type AnswerState = {
  text: string; // free-text / written notes
  value: string; // selected option (multiple_choice) or rating
  mediaBlob: Blob | null;
  mediaUrl: string | null;
  mimeType: string;
  takes: number; // how many recordings have been made
};

const emptyInfo: BasicInfo = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedIn: "",
  yearsExp: "",
};

const emptyAnswer: AnswerState = {
  text: "",
  value: "",
  mediaBlob: null,
  mediaUrl: null,
  mimeType: "video/webm",
  takes: 0,
};

export default function InterviewClient({
  slug,
  title,
  round,
  roleTitle,
  intro,
  videoRequired,
  questions,
  config = DEFAULT_INTERVIEW_CONFIG,
  submitUrl,
  prefill,
  collectInfo = true,
}: {
  slug: string;
  title: string;
  round: number;
  roleTitle: string | null;
  intro: string | null;
  videoRequired: boolean;
  questions: InterviewQuestion[];
  config?: InterviewConfig;
  submitUrl?: string;
  prefill?: Partial<BasicInfo>;
  collectInfo?: boolean;
}) {
  const continuous = config.captureMode === "continuous";
  const firstQuestionStep: "info" | number | "review" = collectInfo
    ? "info"
    : questions.length > 0
      ? 0
      : "review";
  const [step, setStep] = useState<"intro" | "info" | number | "review" | "done">(
    "intro"
  );
  const [info, setInfo] = useState<BasicInfo>({ ...emptyInfo, ...prefill });
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() =>
    Object.fromEntries(questions.map((q) => [q.id, { ...emptyAnswer }]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // ---- continuous session capture ----
  const session = useContinuousSession(continuous);

  const updateAnswer = (id: string, patch: Partial<AnswerState>) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const beginInterview = async () => {
    setError("");
    if (continuous) {
      const ok = await session.start();
      if (!ok) {
        setError(
          "We couldn't start your camera/microphone. This interview records your whole session — please allow access and try again."
        );
        return;
      }
    }
    setStep(firstQuestionStep);
  };

  const goReview = async () => {
    if (continuous) await session.stop();
    setStep("review");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("fullName", info.fullName);
      fd.append("email", info.email);
      fd.append("phone", info.phone);
      fd.append("location", info.location);
      fd.append("linkedIn", info.linkedIn);
      fd.append("yearsExp", info.yearsExp);
      for (const q of questions) {
        const a = answers[q.id];
        // For choice / rating the selected value is the answer; otherwise notes.
        const textValue =
          q.type === "multiple_choice" || q.type === "rating" ? a.value : a.text;
        fd.append(`answer_${q.id}`, textValue);
        if (!continuous && a.mediaBlob) {
          const ext = a.mimeType.includes("mp4") ? "mp4" : "webm";
          fd.append(`video_${q.id}`, a.mediaBlob, `${q.id}.${ext}`);
        }
      }
      if (continuous && session.blob) {
        const ext = session.mimeType.includes("mp4") ? "mp4" : "webm";
        fd.append("video___session__", session.blob, `session.${ext}`);
      }
      const res = await fetch(submitUrl ?? `/api/interviews/${slug}/submit`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Submission failed");
        return;
      }
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const lastIndex = questions.length - 1;
  const qBase = collectInfo ? 2 : 1; // stage index of the first question
  const totalStages = qBase + questions.length + 1; // …+ review + done
  const stageIndex =
    step === "intro"
      ? 0
      : step === "info"
        ? 1
        : typeof step === "number"
          ? qBase + step
          : step === "review"
            ? qBase + questions.length
            : totalStages; // done
  const progress = Math.min(100, Math.round((stageIndex / totalStages) * 100));
  const stageLabel =
    step === "intro"
      ? "Welcome"
      : step === "info"
        ? "Your details"
        : typeof step === "number"
          ? `Question ${step + 1} of ${questions.length}`
          : step === "review"
            ? "Review"
            : "Complete";

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-teal-900 px-6 py-5 text-white">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-teal-200 text-sm mt-1">
              {roundLabel(round)} ·{" "}
              {continuous ? "Proctored video interview" : "Self-paced interview"}
              {roleTitle ? ` · ${roleTitle}` : ""}
            </p>
          </div>

          {/* Progress */}
          <div className="px-6 sm:px-8 pt-4">
            <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
              <span className="font-medium text-teal-700">{stageLabel}</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full bg-teal-600 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="p-6 sm:p-8">
            {step === "intro" && (
              <IntroStep
                round={round}
                roleTitle={roleTitle}
                intro={intro}
                videoRequired={videoRequired}
                continuous={continuous}
                maxSubmissions={config.maxSubmissions}
                onContinue={beginInterview}
              />
            )}

            {step === "info" && collectInfo && (
              <InfoStep
                info={info}
                onChange={setInfo}
                onContinue={() => setStep(questions.length > 0 ? 0 : "review")}
              />
            )}

            {typeof step === "number" && questions[step] && (
              <QuestionStep
                index={step}
                question={questions[step]}
                total={questions.length}
                videoRequired={videoRequired}
                continuous={continuous}
                answer={answers[questions[step].id]}
                onChange={(patch) => updateAnswer(questions[step].id, patch)}
                onBack={() =>
                  setStep(step === 0 ? (collectInfo ? "info" : "intro") : step - 1)
                }
                onNext={() =>
                  step === lastIndex ? goReview() : setStep(step + 1)
                }
              />
            )}

            {step === "review" && (
              <ReviewStep
                info={info}
                questions={questions}
                answers={answers}
                continuous={continuous}
                sessionReady={!continuous || !!session.blob}
                submitting={submitting}
                error={error}
                onBack={() =>
                  setStep(
                    questions.length > 0
                      ? lastIndex
                      : collectInfo
                        ? "info"
                        : "intro"
                  )
                }
                onSubmit={handleSubmit}
              />
            )}

            {step === "done" && <DoneStep email={info.email} round={round} />}
          </div>
        </div>

        {/* Persistent error outside steps that own their own error UI */}
        {error && step === "intro" && (
          <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg mt-4">
            {error}
          </p>
        )}
      </div>

      {/* Continuous recording indicator */}
      {continuous && session.recording && step !== "intro" && step !== "done" && (
        <SessionBar
          elapsed={session.elapsed}
          previewRef={session.previewRef}
        />
      )}
    </div>
  );
}

// ============================ continuous session ============================

function useContinuousSession(enabled: boolean) {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [mimeType, setMimeType] = useState("video/webm");

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    if (!enabled) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      const mime = pickMime(true);
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const b = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        setBlob(b);
        setMimeType(recorder.mimeType || "video/webm");
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      // Attach preview after the next paint.
      setTimeout(() => {
        if (previewRef.current) {
          previewRef.current.srcObject = stream;
          previewRef.current.muted = true;
          previewRef.current.play().catch(() => {});
        }
      }, 50);
      return true;
    } catch {
      return false;
    }
  }, [enabled]);

  const stop = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  return { start, stop, recording, elapsed, blob, mimeType, previewRef };
}

function SessionBar({
  elapsed,
  previewRef,
}: {
  elapsed: number;
  previewRef: React.RefObject<HTMLVideoElement>;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl bg-gray-900/90 backdrop-blur px-3 py-2 shadow-lg">
      <video
        ref={previewRef}
        className="h-16 w-24 rounded-md bg-black object-cover"
        playsInline
        muted
      />
      <div className="pr-1">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-semibold text-white uppercase tracking-wide">
            Recording
          </span>
        </div>
        <p className="text-xs text-gray-300 tabular-nums mt-0.5">{fmtTime(elapsed)}</p>
      </div>
    </div>
  );
}

// ================================ steps ================================

function IntroStep({
  round,
  roleTitle,
  intro,
  videoRequired,
  continuous,
  maxSubmissions,
  onContinue,
}: {
  round: number;
  roleTitle: string | null;
  intro: string | null;
  videoRequired: boolean;
  continuous: boolean;
  maxSubmissions: number;
  onContinue: () => void;
}) {
  return (
    <div>
      {intro ? (
        <p className="text-gray-700 leading-relaxed whitespace-pre-line">{intro}</p>
      ) : (
        <>
          <p className="text-gray-700 leading-relaxed">
            Welcome! You&apos;ve been invited to the {roundLabel(round).toLowerCase()}{" "}
            interview{roleTitle ? <> for the <strong>{roleTitle}</strong> role</> : ""} at AALB.
          </p>
          <p className="text-gray-700 leading-relaxed mt-3">
            {continuous
              ? "This interview records your camera and microphone for the entire session. You'll answer a series of questions on screen."
              : "This interview is self-paced. You'll be asked a few short questions and can record a short answer for each."}
          </p>
        </>
      )}
      <ul className="list-disc pl-5 mt-4 text-sm text-gray-600 space-y-1">
        <li>Allow camera + microphone access when prompted.</li>
        {continuous ? (
          <li className="text-gray-700 font-medium">
            Your full session is recorded — once you begin, recording continues
            until you finish.
          </li>
        ) : (
          <li>You can re-record within the limits shown on each question.</li>
        )}
        {videoRequired && !continuous && (
          <li className="text-gray-700 font-medium">
            A recording is required for each question.
          </li>
        )}
        {maxSubmissions > 1 && (
          <li>You have {maxSubmissions} submission attempts for this round.</li>
        )}
      </ul>
      <button
        onClick={onContinue}
        className="mt-6 w-full bg-teal-700 text-white py-3 rounded-lg font-semibold hover:bg-teal-800 transition-colors"
      >
        {continuous ? "Start recorded interview" : "Get Started"}
      </button>
    </div>
  );
}

function InfoStep({
  info,
  onChange,
  onContinue,
}: {
  info: BasicInfo;
  onChange: (i: BasicInfo) => void;
  onContinue: () => void;
}) {
  const valid = info.fullName && info.email && info.phone;
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onContinue();
      }}
      className="space-y-4"
    >
      <h2 className="text-lg font-semibold text-gray-900">Tell us about you</h2>
      <Field label="Full name *" value={info.fullName} onChange={(v) => onChange({ ...info, fullName: v })} />
      <Field label="Email *" type="email" value={info.email} onChange={(v) => onChange({ ...info, email: v })} />
      <Field label="Phone *" type="tel" value={info.phone} onChange={(v) => onChange({ ...info, phone: v })} />
      <Field label="City / location" value={info.location} onChange={(v) => onChange({ ...info, location: v })} placeholder="e.g. Mexico City" />
      <Field label="LinkedIn URL (optional)" value={info.linkedIn} onChange={(v) => onChange({ ...info, linkedIn: v })} />
      <Field label="Years of relevant experience" value={info.yearsExp} onChange={(v) => onChange({ ...info, yearsExp: v })} placeholder="e.g. 5" />
      <button
        type="submit"
        disabled={!valid}
        className="w-full bg-teal-700 text-white py-3 rounded-lg font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50"
      >
        Continue
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
      />
    </div>
  );
}

function QuestionStep({
  index,
  total,
  question,
  videoRequired,
  continuous,
  answer,
  onChange,
  onBack,
  onNext,
}: {
  index: number;
  total: number;
  question: InterviewQuestion;
  videoRequired: boolean;
  continuous: boolean;
  answer: AnswerState;
  onChange: (patch: Partial<AnswerState>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const q = question;
  const media = isMediaType(q.type);
  const mediaRequired = media && (q.required || (q.type === "video" && videoRequired));

  // Compute whether the candidate may proceed.
  let blocked = false;
  if (continuous && media) {
    blocked = false; // session is recording; nothing per-question to gate
  } else if (media) {
    blocked = mediaRequired && !answer.mediaBlob;
  } else if (q.type === "multiple_choice" || q.type === "rating") {
    blocked = q.required && !answer.value;
  } else {
    blocked = q.required && !answer.text.trim();
  }

  return (
    <div>
      <p className="text-sm text-teal-700 font-medium">
        Question {index + 1} of {total}
        <TypeBadge type={q.type} />
      </p>
      <h2 className="text-xl font-semibold text-gray-900 mt-1">{q.prompt}</h2>
      {q.helpText && <p className="text-sm text-gray-500 mt-1">{q.helpText}</p>}

      <div className="mt-6">
        {media ? (
          continuous ? (
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
              You&apos;re being recorded. Answer this question aloud, then continue.
              {q.maxDurationSec > 0 && (
                <span className="block text-teal-700 mt-1">
                  Suggested length: up to {fmtTime(q.maxDurationSec)}.
                </span>
              )}
            </div>
          ) : (
            <MediaAnswerRecorder
              audioOnly={q.type === "audio"}
              maxTakes={q.maxTakes}
              maxDurationSec={q.maxDurationSec}
              prepTimeSec={q.prepTimeSec}
              allowReview={q.allowReview}
              takes={answer.takes}
              mediaUrl={answer.mediaUrl}
              onRecorded={(blob, mimeType) => {
                const url = URL.createObjectURL(blob);
                onChange({
                  mediaBlob: blob,
                  mediaUrl: url,
                  mimeType,
                  takes: answer.takes + 1,
                });
              }}
              onClear={() => {
                if (answer.mediaUrl) URL.revokeObjectURL(answer.mediaUrl);
                onChange({ mediaBlob: null, mediaUrl: null });
              }}
            />
          )
        ) : q.type === "multiple_choice" ? (
          <ChoiceInput
            options={q.options}
            value={answer.value}
            onChange={(value) => onChange({ value })}
          />
        ) : q.type === "rating" ? (
          <RatingInput
            scale={q.ratingScale}
            value={answer.value}
            onChange={(value) => onChange({ value })}
          />
        ) : (
          <textarea
            rows={6}
            autoFocus
            value={answer.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Type your answer…"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
          />
        )}
      </div>

      {/* Optional written notes for media questions */}
      {media && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Optional: written notes
          </label>
          <textarea
            rows={3}
            value={answer.text}
            onChange={(e) => onChange({ text: e.target.value })}
            placeholder="Add any written context (optional)"
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
          />
        </div>
      )}

      {blocked && (
        <p className="text-amber-700 text-sm bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mt-4">
          {media
            ? "A recording is required for this question before you can continue."
            : "An answer is required for this question before you can continue."}
        </p>
      )}

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 px-6 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={blocked}
          className="flex-1 bg-teal-700 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {index === total - 1 ? "Review" : "Next"}
        </button>
      </div>
    </div>
  );
}

function TypeBadge({ type }: { type: InterviewQuestion["type"] }) {
  const label =
    type === "video"
      ? "Video"
      : type === "audio"
        ? "Audio"
        : type === "text"
          ? "Written"
          : type === "multiple_choice"
            ? "Choice"
            : "Rating";
  return (
    <span className="ml-2 inline-block align-middle px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500">
      {label}
    </span>
  );
}

function ChoiceInput({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  if (options.length === 0) {
    return <p className="text-sm text-gray-400">No options were configured.</p>;
  }
  return (
    <div className="space-y-2">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-lg border transition-colors ${
              selected
                ? "border-teal-600 bg-teal-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                selected ? "border-teal-600 bg-teal-600" : "border-gray-300"
              }`}
            >
              {selected && <span className="h-2 w-2 rounded-full bg-white" />}
            </span>
            <span className="text-sm text-gray-800">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}

function RatingInput({
  scale,
  value,
  onChange,
}: {
  scale: number;
  value: string;
  onChange: (v: string) => void;
}) {
  const nums = Array.from({ length: scale }, (_, i) => i + 1);
  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        {nums.map((n) => {
          const selected = value === String(n);
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(String(n))}
              className={`h-11 w-11 rounded-lg border text-sm font-semibold transition-colors ${
                selected
                  ? "border-teal-600 bg-teal-600 text-white"
                  : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              {n}
            </button>
          );
        })}
      </div>
      <div className="flex justify-between text-xs text-gray-400 mt-1.5 max-w-[22rem]">
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  );
}

function MediaAnswerRecorder({
  audioOnly,
  maxTakes,
  maxDurationSec,
  prepTimeSec,
  allowReview,
  takes,
  mediaUrl,
  onRecorded,
  onClear,
}: {
  audioOnly: boolean;
  maxTakes: number; // 0 = unlimited
  maxDurationSec: number; // 0 = no limit
  prepTimeSec: number; // 0 = none
  allowReview: boolean;
  takes: number;
  mediaUrl: string | null;
  onRecorded: (blob: Blob, mimeType: string) => void;
  onClear: () => void;
}) {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stopTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recording, setRecording] = useState(false);
  const [prepLeft, setPrepLeft] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [recorded, setRecorded] = useState(false);

  const takesExhausted = maxTakes > 0 && takes >= maxTakes;
  const takesLeftLabel =
    maxTakes > 0 ? `${Math.max(0, maxTakes - takes)} of ${maxTakes} takes left` : null;

  const cleanupStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (previewRef.current) previewRef.current.srcObject = null;
  }, []);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
      cleanupStream();
    };
  }, [cleanupStream]);

  const actuallyStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: !audioOnly,
        audio: true,
      });
      streamRef.current = stream;
      if (!audioOnly && previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.muted = true;
        await previewRef.current.play().catch(() => {});
      }
      const mime = pickMime(!audioOnly);
      const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || (audioOnly ? "audio/webm" : "video/webm"),
        });
        onRecorded(blob, recorder.mimeType || (audioOnly ? "audio/webm" : "video/webm"));
        setRecorded(true);
        cleanupStream();
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
      setElapsed(0);
      tickRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
      if (maxDurationSec > 0) {
        stopTimerRef.current = setTimeout(() => stop(), maxDurationSec * 1000);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not access camera/microphone");
    }
  };

  const start = async () => {
    setError("");
    setRecorded(false);
    if (prepTimeSec > 0) {
      setPrepLeft(prepTimeSec);
      let left = prepTimeSec;
      const id = setInterval(() => {
        left -= 1;
        setPrepLeft(left);
        if (left <= 0) {
          clearInterval(id);
          void actuallyStart();
        }
      }, 1000);
    } else {
      await actuallyStart();
    }
  };

  const stop = () => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (stopTimerRef.current) clearTimeout(stopTimerRef.current);
    recorderRef.current?.stop();
    setRecording(false);
  };

  const remaining = maxDurationSec > 0 ? Math.max(0, maxDurationSec - elapsed) : null;
  const showPlayback = mediaUrl && allowReview;

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      {/* Preview / playback surface */}
      {audioOnly ? (
        <div className="rounded-md bg-gray-900 mb-3 h-24 flex items-center justify-center">
          {showPlayback ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <audio src={mediaUrl} controls className="w-full px-3" />
          ) : recording ? (
            <div className="flex items-center gap-2 text-white">
              <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-medium">Recording audio…</span>
            </div>
          ) : mediaUrl ? (
            <span className="text-gray-300 text-sm">Audio recorded ✓</span>
          ) : (
            <span className="text-gray-500 text-sm">🎙️ Audio only</span>
          )}
        </div>
      ) : (
        <div className="aspect-video bg-black rounded-md overflow-hidden mb-3">
          {showPlayback ? (
            <video src={mediaUrl} controls className="w-full h-full" />
          ) : mediaUrl && !allowReview ? (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
              Recorded ✓ — playback disabled for this question
            </div>
          ) : (
            <video ref={previewRef} className="w-full h-full" playsInline />
          )}
        </div>
      )}

      {/* Live status row */}
      {(recording || prepLeft > 0 || takesLeftLabel) && (
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="text-gray-500">
            {prepLeft > 0
              ? `Get ready… recording in ${prepLeft}s`
              : recording
                ? `Recording ${fmtTime(elapsed)}${
                    remaining !== null ? ` · ${fmtTime(remaining)} left` : ""
                  }`
                : ""}
          </span>
          {takesLeftLabel && <span className="text-gray-400">{takesLeftLabel}</span>}
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm bg-red-50 p-2 rounded mb-2">{error}</p>
      )}

      <div className="flex gap-2">
        {!mediaUrl && !recording && prepLeft === 0 && (
          <button
            type="button"
            onClick={start}
            disabled={takesExhausted}
            className="flex-1 bg-red-600 text-white py-2 rounded-md font-medium hover:bg-red-700 disabled:opacity-50"
          >
            {takesExhausted ? "No takes remaining" : "Start Recording"}
          </button>
        )}
        {recording && (
          <button
            type="button"
            onClick={stop}
            className="flex-1 bg-gray-900 text-white py-2 rounded-md font-medium hover:bg-black"
          >
            Stop
          </button>
        )}
        {mediaUrl && !recording && (
          <button
            type="button"
            onClick={onClear}
            disabled={takesExhausted}
            className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-md font-medium hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
            title={takesExhausted ? "You've used all your takes" : undefined}
          >
            {takesExhausted ? "Re-record (no takes left)" : "Re-record"}
          </button>
        )}
      </div>
      {recorded && !allowReview && mediaUrl && (
        <p className="text-xs text-gray-500 mt-2">
          Your answer was captured. You can&apos;t replay it for this question.
        </p>
      )}
    </div>
  );
}

function ReviewStep({
  info,
  questions,
  answers,
  continuous,
  sessionReady,
  submitting,
  error,
  onBack,
  onSubmit,
}: {
  info: BasicInfo;
  questions: InterviewQuestion[];
  answers: Record<string, AnswerState>;
  continuous: boolean;
  sessionReady: boolean;
  submitting: boolean;
  error: string;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Review and submit</h2>
      <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
        <p><strong>{info.fullName}</strong> — {info.email} — {info.phone}</p>
        {info.location && <p className="text-gray-600">{info.location}</p>}
      </div>

      {continuous && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            sessionReady
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {sessionReady
            ? "✓ Your full session recording is ready to submit."
            : "Preparing your session recording…"}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {questions.map((q, i) => {
          const a = answers[q.id];
          const summary = answerSummary(q, a, continuous);
          return (
            <div key={q.id} className="border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900">
                Q{i + 1}: {q.prompt}
              </p>
              <p className="text-xs text-gray-500 mt-1">{summary}</p>
            </div>
          );
        })}
      </div>
      {error && (
        <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg mt-4">{error}</p>
      )}
      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="flex-1 px-6 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting}
          className="flex-1 bg-teal-700 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-teal-800 disabled:opacity-50"
        >
          {submitting ? "Uploading… please don't close this tab" : "Submit"}
        </button>
      </div>
    </div>
  );
}

function answerSummary(
  q: InterviewQuestion,
  a: AnswerState | undefined,
  continuous: boolean
): string {
  if (!a) return "No answer";
  if (isMediaType(q.type)) {
    if (continuous) return "Captured in session recording";
    const parts: string[] = [];
    parts.push(a.mediaBlob ? `${q.type} recorded` : "No recording");
    if (a.text.trim()) parts.push("written notes added");
    return parts.join(" · ");
  }
  if (q.type === "multiple_choice" || q.type === "rating") {
    return a.value ? `Answered: ${a.value}` : "Not answered";
  }
  return a.text.trim() ? "Answered" : "Not answered";
}

function DoneStep({ email, round }: { email: string; round: number }) {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-green-700 text-2xl">✓</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900">Submission received</h2>
      <p className="text-gray-600 mt-2">
        Thanks for completing your {roundLabel(round).toLowerCase()} interview. A
        confirmation has been sent to <strong>{email}</strong>.
      </p>
      <p className="text-gray-500 text-sm mt-3">
        The hiring team will review your responses and follow up with next steps.
      </p>
    </div>
  );
}

// ================================ utils ================================

function pickMime(withVideo: boolean): string {
  const candidates = withVideo
    ? [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ]
    : ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  if (typeof MediaRecorder === "undefined") return "";
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
}

function fmtTime(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
