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

export default function BookingPage() {
  const [taken, setTaken] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Slot | null>(null);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<Slot | null>(null);

  useEffect(() => {
    refreshTaken();
  }, []);

  const refreshTaken = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings/mexico-city-skills-lab");
      const data = await res.json();
      setTaken(new Set(data.taken || []));
    } finally {
      setLoading(false);
    }
  };

  const isTaken = (date: string, hour: number) =>
    taken.has(slotToUtc(date, hour).toISOString());

  const handleConfirm = async () => {
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Booking failed");
        if (res.status === 409) refreshTaken();
        return;
      }
      setConfirmed(selected);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-green-700 text-2xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">You're booked!</h1>
          <p className="text-gray-700 mt-2">
            <strong>{formatDateLabel(confirmed.date)}</strong>
            <br />
            <strong>{formatSlotLabel(confirmed.hour)}</strong> Mexico City time
          </p>
          <p className="text-gray-500 text-sm mt-4">
            A confirmation has been sent to <strong>{form.email}</strong>. We'll
            email the exact location and details before your slot.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-100">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-teal-900 px-6 py-5 text-white">
            <h1 className="text-2xl font-bold">Book your in-person interview</h1>
            <p className="text-teal-200 text-sm mt-1">
              Skills Lab Leader · Mexico City · May 7–9 · times shown in Mexico City local time
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {loading ? (
              <p className="text-gray-500 text-sm">Loading available slots…</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {BOOKING_DATES.map((date) => (
                  <DayCard
                    key={date}
                    date={date}
                    selected={selected}
                    isTaken={isTaken}
                    onSelect={(hour) => setSelected({ date, hour })}
                  />
                ))}
              </div>
            )}

            {selected && (
              <div className="mt-8 border-t border-gray-100 pt-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {formatDateLabel(selected.date)} · {formatSlotLabel(selected.hour)}
                </h2>
                <p className="text-sm text-gray-500 mb-4">Confirm your details to lock in this slot.</p>
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleConfirm();
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <BField label="Full name *" value={form.fullName} onChange={(v) => setForm((f) => ({ ...f, fullName: v }))} />
                    <BField label="Email *" type="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
                    <BField label="Phone *" type="tel" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                    <textarea
                      rows={3}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                    />
                  </div>
                  {error && (
                    <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg">{error}</p>
                  )}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setSelected(null)}
                      disabled={submitting}
                      className="px-6 py-2.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                    >
                      Pick a different time
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !form.fullName || !form.email || !form.phone}
                      className="flex-1 bg-teal-700 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-teal-800 disabled:opacity-50"
                    >
                      {submitting ? "Booking…" : "Confirm booking"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayCard({
  date,
  selected,
  isTaken,
  onSelect,
}: {
  date: string;
  selected: { date: string; hour: number } | null;
  isTaken: (d: string, h: number) => boolean;
  onSelect: (hour: number) => void;
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="bg-teal-50 px-4 py-3 border-b border-gray-200">
        <p className="text-sm text-teal-700 font-medium">
          {formatDateLabel(date)}
        </p>
      </div>
      <div className="p-3 grid grid-cols-2 gap-2">
        {BOOKING_HOURS.map((hour) => {
          const taken = isTaken(date, hour);
          const isSel =
            selected?.date === date && selected?.hour === hour;
          return (
            <button
              key={hour}
              type="button"
              disabled={taken}
              onClick={() => onSelect(hour)}
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

function BField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
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
    </div>
  );
}
