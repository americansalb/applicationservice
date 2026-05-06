"use client";

import { useEffect, useRef, useState } from "react";
import { COMPETENCY_QUESTIONS } from "@/lib/skillsLabLeader";

type BasicInfo = {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedIn: string;
  yearsExp: string;
};

type AnswerState = {
  text: string;
  videoBlob: Blob | null;
  videoUrl: string | null;
  mimeType: string;
};

const emptyInfo: BasicInfo = {
  fullName: "",
  email: "",
  phone: "",
  location: "",
  linkedIn: "",
  yearsExp: "",
};

export default function SkillsLabLeaderInterviewPage() {
  const [step, setStep] = useState<"intro" | "info" | number | "review" | "done">("intro");
  const [info, setInfo] = useState<BasicInfo>(emptyInfo);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>(() =>
    Object.fromEntries(
      COMPETENCY_QUESTIONS.map((q) => [
        q.id,
        { text: "", videoBlob: null, videoUrl: null, mimeType: "video/webm" },
      ])
    )
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const updateAnswer = (id: string, patch: Partial<AnswerState>) => {
    setAnswers((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
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
      for (const q of COMPETENCY_QUESTIONS) {
        const a = answers[q.id];
        fd.append(`answer_${q.id}`, a.text);
        if (a.videoBlob) {
          const ext = a.mimeType.includes("mp4") ? "mp4" : "webm";
          fd.append(`video_${q.id}`, a.videoBlob, `${q.id}.${ext}`);
        }
      }
      const res = await fetch("/api/interview/skills-lab-leader", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-teal-900 px-6 py-5 text-white">
            <h1 className="text-2xl font-bold">Skills Lab Leader — Round 2</h1>
            <p className="text-teal-200 text-sm mt-1">Self-paced video interview</p>
          </div>

          <div className="p-6 sm:p-8">
            {step === "intro" && (
              <IntroStep onContinue={() => setStep("info")} />
            )}

            {step === "info" && (
              <InfoStep
                info={info}
                onChange={setInfo}
                onContinue={() => setStep(0)}
              />
            )}

            {typeof step === "number" && (
              <QuestionStep
                index={step}
                question={COMPETENCY_QUESTIONS[step]}
                total={COMPETENCY_QUESTIONS.length}
                answer={answers[COMPETENCY_QUESTIONS[step].id]}
                onChange={(patch) =>
                  updateAnswer(COMPETENCY_QUESTIONS[step].id, patch)
                }
                onBack={() =>
                  setStep(step === 0 ? "info" : step - 1)
                }
                onNext={() =>
                  setStep(
                    step === COMPETENCY_QUESTIONS.length - 1 ? "review" : step + 1
                  )
                }
              />
            )}

            {step === "review" && (
              <ReviewStep
                info={info}
                answers={answers}
                submitting={submitting}
                error={error}
                onBack={() => setStep(COMPETENCY_QUESTIONS.length - 1)}
                onSubmit={handleSubmit}
              />
            )}

            {step === "done" && <DoneStep email={info.email} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function IntroStep({ onContinue }: { onContinue: () => void }) {
  return (
    <div>
      <p className="text-gray-700 leading-relaxed">
        Welcome! You've been invited to the round 2 interview for the{" "}
        <strong>Skills Lab Leader</strong> role at AALB.
      </p>
      <p className="text-gray-700 leading-relaxed mt-3">
        This interview is self-paced. You'll be asked a few short competency
        questions and can record a short video answer (and/or write a response)
        for each.
      </p>
      <ul className="list-disc pl-5 mt-4 text-sm text-gray-600 space-y-1">
        <li>Aim for ~2 minutes per video answer.</li>
        <li>You can re-record as many times as you want before submitting.</li>
        <li>Allow camera + microphone access when prompted.</li>
        <li>Mexico City candidates: book your in-person session via the
          separate link in your invitation email.</li>
      </ul>
      <button
        onClick={onContinue}
        className="mt-6 w-full bg-teal-700 text-white py-3 rounded-lg font-semibold hover:bg-teal-800 transition-colors"
      >
        Get Started
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
  answer,
  onChange,
  onBack,
  onNext,
}: {
  index: number;
  total: number;
  question: { id: string; prompt: string };
  answer: AnswerState;
  onChange: (patch: Partial<AnswerState>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div>
      <p className="text-sm text-teal-700 font-medium">
        Question {index + 1} of {total}
      </p>
      <h2 className="text-xl font-semibold text-gray-900 mt-1">
        {question.prompt}
      </h2>

      <div className="mt-6">
        <Recorder
          videoUrl={answer.videoUrl}
          onRecorded={(blob, mimeType) => {
            const url = URL.createObjectURL(blob);
            onChange({ videoBlob: blob, videoUrl: url, mimeType });
          }}
          onClear={() => {
            if (answer.videoUrl) URL.revokeObjectURL(answer.videoUrl);
            onChange({ videoBlob: null, videoUrl: null });
          }}
        />
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Optional: written notes
        </label>
        <textarea
          rows={4}
          value={answer.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder="Add any written context (optional)"
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
        />
      </div>

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
          className="flex-1 bg-teal-700 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-teal-800"
        >
          {index === total - 1 ? "Review" : "Next"}
        </button>
      </div>
    </div>
  );
}

function Recorder({
  videoUrl,
  onRecorded,
  onClear,
}: {
  videoUrl: string | null;
  onRecorded: (blob: Blob, mimeType: string) => void;
  onClear: () => void;
}) {
  const previewRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const start = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      streamRef.current = stream;
      if (previewRef.current) {
        previewRef.current.srcObject = stream;
        previewRef.current.muted = true;
        await previewRef.current.play();
      }
      const mimeCandidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      const mimeType =
        mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "video/webm",
        });
        onRecorded(blob, recorder.mimeType || "video/webm");
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (previewRef.current) previewRef.current.srcObject = null;
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Could not access camera/microphone"
      );
    }
  };

  const stop = () => {
    recorderRef.current?.stop();
    setRecording(false);
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="aspect-video bg-black rounded-md overflow-hidden mb-3">
        {videoUrl ? (
          <video src={videoUrl} controls className="w-full h-full" />
        ) : (
          <video ref={previewRef} className="w-full h-full" playsInline />
        )}
      </div>
      {error && (
        <p className="text-red-500 text-sm bg-red-50 p-2 rounded mb-2">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        {!videoUrl && !recording && (
          <button
            type="button"
            onClick={start}
            className="flex-1 bg-red-600 text-white py-2 rounded-md font-medium hover:bg-red-700"
          >
            Start Recording
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
        {videoUrl && (
          <button
            type="button"
            onClick={onClear}
            className="flex-1 bg-white border border-gray-300 text-gray-700 py-2 rounded-md font-medium hover:bg-gray-100"
          >
            Re-record
          </button>
        )}
      </div>
    </div>
  );
}

function ReviewStep({
  info,
  answers,
  submitting,
  error,
  onBack,
  onSubmit,
}: {
  info: BasicInfo;
  answers: Record<string, AnswerState>;
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
      <div className="mt-4 space-y-3">
        {COMPETENCY_QUESTIONS.map((q, i) => {
          const a = answers[q.id];
          const hasVideo = !!a.videoBlob;
          const hasText = !!a.text.trim();
          return (
            <div key={q.id} className="border border-gray-200 rounded-lg p-3">
              <p className="text-sm font-medium text-gray-900">
                Q{i + 1}: {q.prompt}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {hasVideo ? "Video recorded" : "No video"}
                {hasText ? " · written notes added" : ""}
              </p>
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

function DoneStep({ email }: { email: string }) {
  return (
    <div className="text-center py-8">
      <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-green-700 text-2xl">✓</span>
      </div>
      <h2 className="text-xl font-bold text-gray-900">Submission received</h2>
      <p className="text-gray-600 mt-2">
        Thanks! A confirmation has been sent to <strong>{email}</strong>.
      </p>
      <p className="text-gray-500 text-sm mt-3">
        If you're in Mexico City, don't forget to book your in-person session
        with the separate link in your invitation email.
      </p>
    </div>
  );
}
