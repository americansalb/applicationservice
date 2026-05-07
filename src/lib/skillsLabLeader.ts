export const SKILLS_LAB_LEADER_SLUG = "skills-lab-leader";
export const SKILLS_LAB_LEADER_BOOKING_SLUG = "mexico-city-skills-lab";

export const COMPETENCY_QUESTIONS: { id: string; prompt: string }[] = [
  {
    id: "q1",
    prompt:
      "Walk us through a training session you designed and ran. What were the learning outcomes and how did you measure them?",
  },
  {
    id: "q2",
    prompt:
      "Describe a time you had to adapt a session in real time because participants weren't engaging. What did you do?",
  },
  {
    id: "q3",
    prompt:
      "How do you measure whether a Skills Lab participant has actually built competency vs. just completed the activities?",
  },
  {
    id: "q4",
    prompt:
      "Tell us about a challenging participant you worked with and how you handled it.",
  },
  {
    id: "q5",
    prompt: "Why this role at AALB specifically?",
  },
];

export const MEXICO_CITY_TIMEZONE = "America/Mexico_City";

// Mexico City is UTC-6 (no DST as of 2023).
const MEXICO_CITY_UTC_OFFSET_HOURS = -6;

export type SlotTime = { hour: number; minute: number };

// Per-day slots. Each slot is a 1-hour appointment starting at the given
// hour:minute in Mexico City local time. The "last appointment" rules
// from the venue dictate when the latest start time is on each day.
export const BOOKING_SLOTS_BY_DATE: Record<string, SlotTime[]> = {
  // Thursday: 5 PM – 8 PM, last starts 7 PM (7–8)
  "2026-05-07": [
    { hour: 17, minute: 0 },
    { hour: 18, minute: 0 },
    { hour: 19, minute: 0 },
  ],
  // Friday: 11 AM – 3 PM, then 5 PM – 8 PM, last starts 7 PM (7–8)
  "2026-05-08": [
    { hour: 11, minute: 0 },
    { hour: 12, minute: 0 },
    { hour: 13, minute: 0 },
    { hour: 14, minute: 0 },
    { hour: 17, minute: 0 },
    { hour: 18, minute: 0 },
    { hour: 19, minute: 0 },
  ],
  // Saturday: 11 AM – 2 PM, then 4:30 PM – 7:30 PM, last starts 6:30 PM (6:30–7:30)
  "2026-05-09": [
    { hour: 11, minute: 0 },
    { hour: 12, minute: 0 },
    { hour: 13, minute: 0 },
    { hour: 16, minute: 30 },
    { hour: 17, minute: 30 },
    { hour: 18, minute: 30 },
  ],
};

export const BOOKING_DATES = Object.keys(BOOKING_SLOTS_BY_DATE);

export function isValidSlot(dateIso: string, hour: number, minute: number): boolean {
  const slots = BOOKING_SLOTS_BY_DATE[dateIso];
  if (!slots) return false;
  return slots.some((s) => s.hour === hour && s.minute === minute);
}

export function slotToUtc(dateIso: string, hour: number, minute: number = 0): Date {
  const [y, m, d] = dateIso.split("-").map(Number);
  const utcHour = hour - MEXICO_CITY_UTC_OFFSET_HOURS;
  return new Date(Date.UTC(y, m - 1, d, utcHour, minute, 0));
}

export function formatSlotLabel(hour: number, minute: number = 0): string {
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  if (minute === 0) return `${display}:00 ${period}`;
  return `${display}:${String(minute).padStart(2, "0")} ${period}`;
}

export function formatDateLabel(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateLabelShort(dateIso: string): string {
  const [y, m, d] = dateIso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
