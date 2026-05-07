"use client";

import { useEffect, useState } from "react";
import {
  BOOKING_DATES,
  BOOKING_HOURS,
  formatDateLabel,
  formatSlotLabel,
  slotToUtc,
} from "@/lib/skillsLabLeader";

type Slot = { date: string; hour: number };
type Step = "slot" | "info" | "done";

export default function BookingPage() {
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [step, setStep] = useState<Step>("slot");
  const [selected, setSelected] = useState<Slot | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    refreshTaken();
  }, []);

  const refreshTaken = async () => {
    setLoading(true);
    setLoadFailed(false);
    try {
      const res = await fetch("/api/bookings/mexico-city-skills-lab");
      if (!res.ok) {
        setTaken(new Set());
        setLoadFailed(true);
        return;
      }
      const data = await res.json().catch(() => ({ taken: [] }));
      setTaken(new Set(data.taken || []));
    } catch {
      setTaken(new Set());
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const isTaken = (date: string, hour: number) => {
    const d = slotToUtc(date, hour);
    if (!(d instanceof Date) || Number.isNaN(d.getTime())) return false;
    return taken.has(d.toISOString());
  };

  const formValid =
    form.fullName.trim() &&
    form.email.trim() &&
    form.phone.trim() &&
    /\S+@\S+\.\S+/.test(form.email);

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/bookings/mexico-city-skills-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: selected.date,
          hour: selected.hour,
          ...form,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Booking failed. Please try again.");
        if (res.status === 409) {
          await refreshTaken();
          setStep("slot");
          setSelected(null);
        }
        return;
      }
      setStep("done");
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <Header />

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <Stepper step={step} />

          <div className="p-6 sm:p-8">
            {step === "slot" && (
              <SlotStep
                loading={loading}
                loadFailed={loadFailed}
                onRetry={refreshTaken}
                selected={selected}
                isTaken={isTaken}
                onPick={(slot) => {
                  setSelected(slot);
                  setStep("info");
                }}
              />
            )}

            {step === "info" && selected && (
              <InfoStep
                selected={selected}
                form={form}
                setForm={setForm}
                error={error}
                submitting={submitting}
                formValid={Boolean(formValid)}
                onBack={() => {
                  setError("");
                  setStep("slot");
                }}
                onSubmit={handleSubmit}
              />
            )}

            {step === "done" && selected && (
              <DoneStep selected={selected} email={form.email} />
            )}
          </div>
        </div>

        <Footnote />
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-6 text-center">
      <p className="text-xs font-bold uppercase tracking-wider text-teal-700 mb-2">
        In-Person Interview · Mexico City
      </p>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900">
        Book your Skills Lab Leader interview
      </h1>
      <p className="text-gray-600 mt-3 max-w-xl mx-auto">
        This is an <strong>in-person</strong> interview at{" "}
        <strong>Cultumkali Cafe</strong> in Mexico City on May 7–9. All times
        below are shown in <strong>Mexico City local time</strong>.
      </p>
    </div>
  );
}

const VENUE_NAME = "Cultumkali Cafe";
const VENUE_ADDRESS =
  "Av. Universidad 457-Local C, Narvarte Poniente, Benito Juárez, 03020 Ciudad de México, CDMX";
const VENUE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(`${VENUE_NAME}, ${VENUE_ADDRESS}`);

function Stepper({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "slot", label: "Pick a time" },
    { id: "info", label: "Your details" },
    { id: "done", label: "Confirmed" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return (
    <div className="bg-teal-900 px-6 py-4">
      <div className="flex items-center gap-2 sm:gap-4">
        {steps.map((s, i) => {
          const done = i < idx;
          const current = i === idx;
          return (
            <div key={s.id} className="flex-1 flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  done
                    ? "bg-teal-300 text-teal-900"
                    : current
                    ? "bg-white text-teal-900"
                    : "bg-teal-800 text-teal-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs sm:text-sm font-medium truncate ${
                  current ? "text-white" : done ? "text-teal-200" : "text-teal-400"
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div className="hidden sm:block flex-1 h-px bg-teal-700" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SlotStep({
  loading,
  loadFailed,
  onRetry,
  selected,
  isTaken,
  onPick,
}: {
  loading: boolean;
  loadFailed: boolean;
  onRetry: () => void;
  selected: Slot | null;
  isTaken: (d: string, h: number) => boolean;
  onPick: (slot: Slot) => void;
}) {
  if (loading) {
    return <p className="text-gray-500 text-sm">Loading available slots…</p>;
  }
  return (
    <div>
      <div className="mb-5 bg-teal-50 border-2 border-teal-200 rounded-xl p-5">
        <p className="text-xs uppercase font-bold tracking-wider text-teal-700">
          You&apos;re booking an in-person interview at
        </p>
        <p className="text-xl font-extrabold text-teal-900 mt-1">{VENUE_NAME}</p>
        <p className="text-sm text-teal-800 mt-0.5">{VENUE_ADDRESS}</p>
        <a
          href={VENUE_MAPS_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-2 text-sm font-semibold text-teal-700 underline"
        >
          Open in Google Maps →
        </a>
      </div>

      {loadFailed && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start justify-between gap-3">
          <p className="text-sm text-amber-900">
            We couldn&apos;t check which slots are taken right now. You can still
            pick a time — if it&apos;s already booked, we&apos;ll let you know.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="text-sm font-medium text-amber-900 underline whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}
      <p className="text-sm text-gray-600 mb-4">
        Pick a date and a 1-hour slot below. All times are Mexico City local time.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {BOOKING_DATES.map((date) => (
          <DayCard
            key={date}
            date={date}
            selected={selected}
            isTaken={isTaken}
            onPick={(hour) => onPick({ date, hour })}
          />
        ))}
      </div>
    </div>
  );
}

function DayCard({
  date,
  selected,
  isTaken,
  onPick,
}: {
  date: string;
  selected: Slot | null;
  isTaken: (d: string, h: number) => boolean;
  onPick: (hour: number) => void;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-teal-50 px-4 py-3 border-b border-gray-200">
        <p className="text-sm text-teal-800 font-semibold">
          {formatDateLabel(date)}
        </p>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {BOOKING_HOURS.map((hour) => {
          const taken = isTaken(date, hour);
          const isSel = selected?.date === date && selected?.hour === hour;
          return (
            <button
              key={hour}
              type="button"
              disabled={taken}
              onClick={() => onPick(hour)}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                taken
                  ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through"
                  : isSel
                  ? "bg-teal-700 text-white border-teal-700"
                  : "bg-white text-gray-700 border-gray-200 hover:border-teal-500 hover:text-teal-700"
              }`}
            >
              {formatSlotLabel(hour)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function InfoStep({
  selected,
  form,
  setForm,
  error,
  submitting,
  formValid,
  onBack,
  onSubmit,
}: {
  selected: Slot;
  form: { fullName: string; email: string; phone: string; notes: string };
  setForm: (
    fn: (f: { fullName: string; email: string; phone: string; notes: string }) => {
      fullName: string;
      email: string;
      phone: string;
      notes: string;
    }
  ) => void;
  error: string;
  submitting: boolean;
  formValid: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (formValid) onSubmit();
      }}
    >
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <p className="text-xs uppercase font-bold tracking-wide text-teal-700">
          Your selected slot
        </p>
        <p className="text-lg font-bold text-teal-900 mt-1">
          {formatDateLabel(selected.date)} · {formatSlotLabel(selected.hour)}
        </p>
        <p className="text-sm text-teal-800 mt-1">
          In-person · Mexico City local time
        </p>
        <div className="mt-3 pt-3 border-t border-teal-200">
          <p className="text-xs uppercase font-bold tracking-wide text-teal-700">
            Where
          </p>
          <p className="text-sm font-bold text-teal-900 mt-1">{VENUE_NAME}</p>
          <p className="text-sm text-teal-800">{VENUE_ADDRESS}</p>
          <a
            href={VENUE_MAPS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-block mt-1 text-sm font-medium text-teal-700 underline"
          >
            Open in Google Maps →
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BField
          label="Full name *"
          value={form.fullName}
          onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
        />
        <BField
          label="Email *"
          type="email"
          value={form.email}
          onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          hint="Confirmation will go here."
        />
        <BField
          label="Phone *"
          type="tel"
          value={form.phone}
          onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
          hint="In case we need to reach you on the day."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes for our team (optional)
        </label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
          placeholder="Anything you'd like us to know ahead of time?"
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-sm text-amber-900">
          <strong>Please arrive on time.</strong> This is a 1-hour in-person
          slot in Mexico City. We&apos;ll only hold your slot for the time you
          book — late arrivals may not be able to interview that day.
        </p>
      </div>

      {error && (
        <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="px-6 py-3 rounded-lg font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50"
        >
          ← Pick a different time
        </button>
        <button
          type="submit"
          disabled={submitting || !formValid}
          className="flex-1 bg-teal-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Booking…" : "Confirm booking"}
        </button>
      </div>
    </form>
  );
}

function DoneStep({ selected, email }: { selected: Slot; email: string }) {
  return (
    <div className="text-center py-4">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-green-700 text-3xl">✓</span>
      </div>
      <h2 className="text-2xl font-bold text-gray-900">You&apos;re booked!</h2>
      <p className="text-gray-700 mt-3">
        <strong>{formatDateLabel(selected.date)}</strong>
        <br />
        <strong>{formatSlotLabel(selected.hour)}</strong> · Mexico City local time
      </p>

      <div className="mt-5 max-w-md mx-auto bg-teal-50 border-2 border-teal-200 rounded-xl p-4 text-left">
        <p className="text-xs uppercase font-bold tracking-wider text-teal-700">
          Where to go
        </p>
        <p className="text-lg font-extrabold text-teal-900 mt-1">{VENUE_NAME}</p>
        <p className="text-sm text-teal-800">{VENUE_ADDRESS}</p>
        <a
          href={VENUE_MAPS_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-2 text-sm font-semibold text-teal-700 underline"
        >
          Open in Google Maps →
        </a>
      </div>

      <div className="mt-5 max-w-md mx-auto space-y-3 text-sm text-gray-600">
        <p>
          A confirmation has been sent to <strong>{email}</strong>.
        </p>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-900 text-left">
          <p className="font-semibold">Please be on time.</p>
          <p className="mt-1">
            This is a 1-hour in-person interview at Cultumkali Cafe. Plan to
            arrive a few minutes early — Mexico City traffic can be
            unpredictable. If you&apos;re running late or need to reschedule,
            reply to your confirmation email as soon as you can.
          </p>
        </div>
      </div>
    </div>
  );
}

function BField({
  label,
  value,
  onChange,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
      />
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function Footnote() {
  return (
    <p className="text-center text-xs text-gray-500 mt-6">
      Need to reschedule after booking? Reply to your confirmation email.
    </p>
  );
}

