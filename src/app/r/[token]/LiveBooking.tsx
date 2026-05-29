"use client";

import { useMemo, useState } from "react";
import { roundLabel } from "@/lib/interviews";
import { formatSlotInTz, tzAbbreviation } from "@/lib/liveSlots";

type Slot = { iso: string; taken: boolean };

export default function LiveBooking({
  token,
  title,
  round,
  roleTitle,
  intro,
  live,
  initialBookedSlot,
}: {
  token: string;
  title: string;
  round: number;
  roleTitle: string | null;
  intro: string | null;
  live: {
    timeZone: string;
    durationMins: number;
    locationLabel: string | null;
    slots: Slot[];
  };
  initialBookedSlot: string | null;
}) {
  const [booked, setBooked] = useState<string | null>(initialBookedSlot);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [activeDate, setActiveDate] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, { iso: string; taken: boolean; timeRange: string }[]>();
    for (const s of live.slots) {
      const { dateLabel, timeRange } = formatSlotInTz(s.iso, live.timeZone, live.durationMins);
      if (!map.has(dateLabel)) map.set(dateLabel, []);
      map.get(dateLabel)!.push({ iso: s.iso, taken: s.taken, timeRange });
    }
    return map;
  }, [live]);

  const dates = Array.from(byDate.keys());
  const current = activeDate && byDate.has(activeDate) ? activeDate : dates[0];
  const tz = live.slots[0] ? tzAbbreviation(live.slots[0].iso, live.timeZone) : live.timeZone;

  const book = async (iso: string) => {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/access/${token}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot: iso }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Booking failed. Please try again.");
        return;
      }
      setBooked(iso);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-100">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-teal-900 px-6 py-5 text-white">
            <h1 className="text-2xl font-bold">{title}</h1>
            <p className="text-teal-200 text-sm mt-1">
              {roundLabel(round)} · Live interview{roleTitle ? ` · ${roleTitle}` : ""}
            </p>
          </div>

          <div className="p-6 sm:p-8">
            {booked ? (
              <Confirmation
                iso={booked}
                live={live}
                tz={tz}
              />
            ) : (
              <>
                {intro ? (
                  <p className="text-gray-700 leading-relaxed whitespace-pre-line mb-6">{intro}</p>
                ) : (
                  <p className="text-gray-700 leading-relaxed mb-6">
                    You&apos;ve reached the <strong>live interview</strong> stage. Pick a
                    time below that works for you. All times are shown in{" "}
                    <strong>{live.timeZone}</strong> ({tz}).
                  </p>
                )}

                {dates.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No times are available right now. Please check back shortly.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-1 border-b border-gray-200 flex-wrap">
                      {dates.map((d) => {
                        const active = d === current;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setActiveDate(d)}
                            className={`relative px-4 py-3 text-sm font-medium transition-colors ${
                              active ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {d}
                            {active && (
                              <span className="absolute left-3 right-3 bottom-0 h-0.5 bg-teal-700 rounded-full" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-5">
                      {(current ? byDate.get(current) || [] : []).map((s) => (
                        <button
                          key={s.iso}
                          type="button"
                          disabled={s.taken || submitting}
                          onClick={() => book(s.iso)}
                          className={`flex items-center justify-between text-left px-4 py-3 rounded-lg border transition-colors ${
                            s.taken
                              ? "bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed"
                              : "bg-white text-gray-900 border-gray-200 hover:border-teal-600 hover:bg-teal-50"
                          }`}
                        >
                          <span className="text-sm font-semibold">{s.timeRange}</span>
                          <span className="text-xs uppercase tracking-wide text-gray-400">
                            {s.taken ? "Taken" : "Book"}
                          </span>
                        </button>
                      ))}
                    </div>

                    {live.locationLabel && (
                      <p className="text-sm text-gray-500 mt-5">
                        <span className="font-medium text-gray-700">Where:</span>{" "}
                        {live.locationLabel}
                      </p>
                    )}
                  </>
                )}

                {error && (
                  <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg mt-5">
                    {error}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Confirmation({
  iso,
  live,
  tz,
}: {
  iso: string;
  live: { timeZone: string; durationMins: number; locationLabel: string | null };
  tz: string;
}) {
  const { dateLabel, timeRange } = formatSlotInTz(iso, live.timeZone, live.durationMins);
  return (
    <div className="py-2">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-11 h-11 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xl">
          ✓
        </span>
        <h2 className="text-2xl font-semibold text-gray-900">You&apos;re booked</h2>
      </div>
      <div className="border-l-2 border-teal-700 pl-4">
        <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500">When</p>
        <p className="text-xl font-semibold text-gray-900 mt-1">{dateLabel}</p>
        <p className="text-sm text-gray-600 mt-1">
          {timeRange} ({tz})
        </p>
        {live.locationLabel && (
          <>
            <p className="text-[11px] uppercase tracking-[0.15em] font-semibold text-gray-500 mt-4">
              Where
            </p>
            <p className="text-sm text-gray-700 mt-1">{live.locationLabel}</p>
          </>
        )}
      </div>
      <p className="text-sm text-gray-600 mt-5">
        A confirmation has been emailed to you. If you need to reschedule, reply to that email.
      </p>
    </div>
  );
}
