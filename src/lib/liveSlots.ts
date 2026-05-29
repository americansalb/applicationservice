// Helpers for the "live" interview round: admin-defined time slots that
// candidates book in-app. Slots are stored as UTC ISO instants; a timezone is
// kept for display so everyone sees the same wall-clock time.

export type LiveConfig = {
  timeZone: string; // IANA tz, e.g. "America/Mexico_City"
  durationMins: number;
  locationLabel: string | null; // e.g. "Google Meet" or a physical address
  slots: string[]; // UTC ISO datetimes
};

export const COMMON_TIMEZONES = [
  "America/Mexico_City",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "UTC",
  "Europe/London",
  "Europe/Madrid",
];

export const DEFAULT_LIVE_CONFIG: LiveConfig = {
  timeZone: "America/Mexico_City",
  durationMins: 45,
  locationLabel: "Video call (link sent after you book)",
  slots: [],
};

// Offset (ms) between the given instant and the same wall-clock read in `tz`.
function tzOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce<Record<string, string>>((acc, p) => {
    if (p.type !== "literal") acc[p.type] = p.value;
    return acc;
  }, {});
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour === "24" ? "0" : parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUTC - date.getTime();
}

// Convert a wall-clock date+time *in `timeZone`* to a UTC ISO instant.
export function wallClockToUtcIso(
  dateStr: string,
  timeStr: string,
  timeZone: string
): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  const t = /^(\d{2}):(\d{2})$/.exec(timeStr);
  if (!m || !t) return null;
  const wallAsUtcMs = Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(t[1]),
    Number(t[2]),
    0
  );
  const guess = new Date(wallAsUtcMs);
  const offset = tzOffsetMs(guess, timeZone);
  const instant = new Date(wallAsUtcMs - offset);
  return instant.toISOString();
}

// Inverse of wallClockToUtcIso: render a UTC instant as wall-clock fields in tz
// (for editing existing slots).
export function isoToWallClock(
  iso: string,
  timeZone: string
): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
    .formatToParts(new Date(iso))
    .reduce<Record<string, string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${hour}:${parts.minute}`,
  };
}

export function formatSlotInTz(
  iso: string,
  timeZone: string,
  durationMins: number
): { dateLabel: string; timeRange: string } {
  const start = new Date(iso);
  const end = new Date(start.getTime() + durationMins * 60_000);
  const dateLabel = start.toLocaleDateString("en-US", {
    timeZone,
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("en-US", {
      timeZone,
      hour: "numeric",
      minute: "2-digit",
    });
  return { dateLabel, timeRange: `${fmtTime(start)} – ${fmtTime(end)}` };
}

export function tzAbbreviation(iso: string, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short",
    }).formatToParts(new Date(iso));
    return parts.find((p) => p.type === "timeZoneName")?.value || timeZone;
  } catch {
    return timeZone;
  }
}

export function normalizeLiveConfig(input: unknown): LiveConfig {
  const obj = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const timeZone =
    typeof obj.timeZone === "string" && obj.timeZone.trim()
      ? obj.timeZone.trim()
      : DEFAULT_LIVE_CONFIG.timeZone;
  // Validate the tz is usable; fall back if not.
  let safeTz = timeZone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
  } catch {
    safeTz = DEFAULT_LIVE_CONFIG.timeZone;
  }
  const durationRaw = Number(obj.durationMins);
  const durationMins =
    Number.isFinite(durationRaw) && durationRaw > 0 ? Math.floor(durationRaw) : DEFAULT_LIVE_CONFIG.durationMins;
  const locationLabel =
    typeof obj.locationLabel === "string" && obj.locationLabel.trim()
      ? obj.locationLabel.trim()
      : null;
  const slotsInput = Array.isArray(obj.slots) ? obj.slots : [];
  const slots = Array.from(
    new Set(
      slotsInput
        .map((s) => {
          const d = new Date(String(s));
          return Number.isNaN(d.getTime()) ? null : d.toISOString();
        })
        .filter((s): s is string => !!s)
    )
  ).sort();
  return { timeZone: safeTz, durationMins, locationLabel, slots };
}
