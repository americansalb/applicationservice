"use client";

import { useEffect, useState } from "react";
import {
  BOOKING_DATES,
  BOOKING_SLOTS_BY_DATE,
  formatDateLabel,
  formatDateLabelShort,
  formatSlotLabel,
  slotToUtc,
  type SlotTime,
} from "@/lib/skillsLabLeader";

type Slot = { date: string; hour: number; minute: number };
type Step = "slot" | "info" | "done";

const VENUE_NAME = "Cultumkali Cafe";
const VENUE_ADDRESS =
  "Av. Universidad 457-Local C, Narvarte Poniente, Benito Juárez, 03020 Ciudad de México, CDMX";
const VENUE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(`${VENUE_NAME}, ${VENUE_ADDRESS}`);

export default function BookingPage() {
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [step, setStep] = useState<Step>("slot");
  const [selected, setSelected] = useState<Slot | null>(null);
  const [activeDate, setActiveDate] = useState<string>(BOOKING_DATES[0]);
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

  const isTaken = (date: string, hour: number, minute: number) => {
    const d = slotToUtc(date, hour, minute);
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
          minute: selected.minute,
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
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <Header />

        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <Stepper step={step} />

          <div className="p-6 sm:p-8">
            {step === "slot" && (
              <SlotStep
                loading={loading}
                loadFailed={loadFailed}
                onRetry={refreshTaken}
                activeDate={activeDate}
                onActiveDateChange={setActiveDate}
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

        <p className="text-center text-xs text-stone-500 mt-6">
          Need to reschedule after booking? Reply to your confirmation email.
        </p>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="mb-8">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-700 mb-2">
        In-person interview · Mexico City · May 7–9
      </p>
      <h1 className="text-3xl sm:text-4xl font-semibold text-stone-900 leading-tight">
        Book your Skills Lab Leader interview
      </h1>
      <p className="text-stone-600 mt-3 max-w-xl">
        Pick a 1-hour slot at <strong>Cultumkali Cafe</strong> in Mexico City.
        All times below are in <strong>Mexico City local time</strong>.
      </p>
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const steps: { id: Step; label: string }[] = [
    { id: "slot", label: "Pick a time" },
    { id: "info", label: "Your details" },
    { id: "done", label: "Confirmed" },
  ];
  const idx = steps.findIndex((s) => s.id === step);
  return (
    <div className="border-b border-stone-200 px-6 sm:px-8 py-4 flex items-center gap-3">
      {steps.map((s, i) => {
        const done = i < idx;
        const current = i === idx;
        return (
          <div key={s.id} className="flex items-center gap-2 flex-1">
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${
                done
                  ? "bg-teal-700 text-white"
                  : current
                  ? "bg-stone-900 text-white"
                  : "bg-stone-200 text-stone-500"
              }`}
            >
              {done ? "✓" : i + 1}
            </span>
            <span
              className={`text-sm ${
                current
                  ? "font-semibold text-stone-900"
                  : done
                  ? "text-stone-700"
                  : "text-stone-400"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <span className="hidden sm:block flex-1 h-px bg-stone-200" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function VenueLine() {
  return (
    <div className="text-sm text-stone-600">
      <span className="font-medium text-stone-900">{VENUE_NAME}</span>
      {" · "}
      <span>{VENUE_ADDRESS}</span>
      {" · "}
      <a
        href={VENUE_MAPS_URL}
        target="_blank"
        rel="noreferrer"
        className="text-teal-700 underline underline-offset-2"
      >
        Open in Google Maps
      </a>
    </div>
  );
}

function SlotStep({
  loading,
  loadFailed,
  onRetry,
  activeDate,
  onActiveDateChange,
  isTaken,
  onPick,
}: {
  loading: boolean;
  loadFailed: boolean;
  onRetry: () => void;
  activeDate: string;
  onActiveDateChange: (d: string) => void;
  isTaken: (d: string, h: number, m: number) => boolean;
  onPick: (slot: Slot) => void;
}) {
  if (loading) {
    return <p className="text-stone-500 text-sm">Loading available slots…</p>;
  }

  const slots = BOOKING_SLOTS_BY_DATE[activeDate] ?? [];

  return (
    <div>
      <VenueLine />

      {loadFailed && (
        <div className="mt-5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-start justify-between gap-3 text-sm">
          <p className="text-amber-900">
            We couldn&apos;t check which slots are taken right now. You can still
            pick a time — if it&apos;s already booked, we&apos;ll let you know.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="font-medium text-amber-900 underline whitespace-nowrap"
          >
            Retry
          </button>
        </div>
      )}

      <div className="mt-7">
        <div className="flex items-center gap-1 border-b border-stone-200">
          {BOOKING_DATES.map((date) => {
            const active = date === activeDate;
            return (
              <button
                key={date}
                type="button"
                onClick={() => onActiveDateChange(date)}
                className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                  active
                    ? "text-stone-900"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                {formatDateLabelShort(date)}
                {active && (
                  <span className="absolute left-3 right-3 bottom-0 h-0.5 bg-stone-900 rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        <p className="text-sm text-stone-600 mt-5 mb-3">
          {formatDateLabel(activeDate)} · 1-hour slots
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {slots.map((s) => (
            <SlotButton
              key={`${s.hour}:${s.minute}`}
              slot={s}
              taken={isTaken(activeDate, s.hour, s.minute)}
              onClick={() =>
                onPick({ date: activeDate, hour: s.hour, minute: s.minute })
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SlotButton({
  slot,
  taken,
  onClick,
}: {
  slot: SlotTime;
  taken: boolean;
  onClick: () => void;
}) {
  const start = formatSlotLabel(slot.hour, slot.minute);
  const endHour = slot.hour + 1;
  const end = formatSlotLabel(endHour, slot.minute);
  return (
    <button
      type="button"
      disabled={taken}
      onClick={onClick}
      className={`group flex items-center justify-between text-left px-4 py-3 rounded-lg border transition-colors ${
        taken
          ? "bg-stone-50 text-stone-400 border-stone-200 cursor-not-allowed"
          : "bg-white text-stone-900 border-stone-200 hover:border-stone-900 hover:bg-stone-50"
      }`}
    >
      <span className="flex flex-col">
        <span className="text-sm font-semibold tracking-tight">{start}</span>
        <span className="text-xs text-stone-500">— {end}</span>
      </span>
      {taken ? (
        <span className="text-[11px] uppercase tracking-wide text-stone-400">
          Taken
        </span>
      ) : (
        <span className="text-stone-400 group-hover:text-stone-900 transition-colors">
          →
        </span>
      )}
    </button>
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
      className="space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        if (formValid) onSubmit();
      }}
    >
      <div className="border-l-2 border-stone-900 pl-4">
        <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-stone-500">
          Your slot
        </p>
        <p className="text-xl font-semibold text-stone-900 mt-1">
          {formatDateLabel(selected.date)} · {formatSlotLabel(selected.hour, selected.minute)}
        </p>
        <p className="text-sm text-stone-600 mt-1">
          1 hour · in-person · Mexico City local time
        </p>
        <p className="text-sm text-stone-700 mt-3">
          <span className="font-medium">{VENUE_NAME}</span>
          <br />
          <span className="text-stone-600">{VENUE_ADDRESS}</span>
          {" · "}
          <a
            href={VENUE_MAPS_URL}
            target="_blank"
            rel="noreferrer"
            className="text-teal-700 underline underline-offset-2"
          >
            Open in Google Maps
          </a>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <BField
          label="Full name"
          required
          value={form.fullName}
          onChange={(v) => setForm((f) => ({ ...f, fullName: v }))}
        />
        <BField
          label="Email"
          required
          type="email"
          value={form.email}
          onChange={(v) => setForm((f) => ({ ...f, email: v }))}
          hint="Confirmation will go here."
        />
        <BField
          label="Phone"
          required
          type="tel"
          value={form.phone}
          onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
          hint="In case we need to reach you on the day."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1.5">
          Notes for our team{" "}
          <span className="text-stone-400 font-normal">(optional)</span>
        </label>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-1 focus:ring-stone-900 focus:border-stone-900 outline-none placeholder:text-stone-400"
          placeholder="Anything you'd like us to know ahead of time?"
        />
      </div>

      <p className="text-sm text-stone-700 border-t border-stone-200 pt-4">
        <span className="font-semibold">Please arrive on time.</span>{" "}
        We hold each slot for 1 hour only. Mexico City traffic can be
        unpredictable — give yourself a buffer. Late arrivals may not be
        able to interview that day.
      </p>

      {error && (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="px-5 py-2.5 rounded-lg text-sm font-medium text-stone-700 border border-stone-200 hover:bg-stone-50 disabled:opacity-50"
        >
          ← Pick a different time
        </button>
        <button
          type="submit"
          disabled={submitting || !formValid}
          className="flex-1 bg-stone-900 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitting ? "Booking…" : "Confirm booking"}
        </button>
      </div>
    </form>
  );
}

function DoneStep({ selected, email }: { selected: Slot; email: string }) {
  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-9 h-9 rounded-full bg-teal-700 text-white flex items-center justify-center text-lg">
          ✓
        </span>
        <h2 className="text-2xl font-semibold text-stone-900">
          You&apos;re booked
        </h2>
      </div>

      <div className="border-l-2 border-stone-900 pl-4 mb-5">
        <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-stone-500">
          When
        </p>
        <p className="text-xl font-semibold text-stone-900 mt-1">
          {formatDateLabel(selected.date)} · {formatSlotLabel(selected.hour, selected.minute)}
        </p>
        <p className="text-sm text-stone-600 mt-1">
          1 hour · Mexico City local time
        </p>

        <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-stone-500 mt-4">
          Where
        </p>
        <p className="text-base font-semibold text-stone-900 mt-1">
          {VENUE_NAME}
        </p>
        <p className="text-sm text-stone-600">{VENUE_ADDRESS}</p>
        <a
          href={VENUE_MAPS_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-block mt-1.5 text-sm text-teal-700 underline underline-offset-2"
        >
          Open in Google Maps →
        </a>
      </div>

      <p className="text-sm text-stone-600">
        A confirmation has been sent to <strong>{email}</strong>.
      </p>

      <p className="text-sm text-stone-700 border-t border-stone-200 pt-4 mt-5">
        <span className="font-semibold">Please arrive on time.</span>{" "}
        Plan to arrive a few minutes early — Mexico City traffic can be
        unpredictable. If you need to reschedule or can no longer attend,
        reply to your confirmation email as soon as you can.
      </p>
    </div>
  );
}

function BField({
  label,
  value,
  onChange,
  type = "text",
  hint,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  hint?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-stone-700 mb-1.5">
        {label}
        {required && <span className="text-stone-400"> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm focus:ring-1 focus:ring-stone-900 focus:border-stone-900 outline-none"
      />
      {hint && <p className="text-xs text-stone-500 mt-1">{hint}</p>}
    </div>
  );
}
