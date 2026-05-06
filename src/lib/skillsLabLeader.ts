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

// Mexico City interview window: May 7-9, 10 AM - 9 PM, 1-hour slots.
// Last slot starts at 8 PM (ends 9 PM).
export const MEXICO_CITY_TIMEZONE = "America/Mexico_City";
export const BOOKING_DATES = ["2026-05-07", "2026-05-08", "2026-05-09"];
export const BOOKING_HOURS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

// Mexico City is UTC-6 (no DST as of 2023).
const MEXICO_CITY_UTC_OFFSET_HOURS = -6;

export function slotKey(dateIso: string, hour: number): string {
  return `${dateIso}T${String(hour).padStart(2, "0")}:00`;
}

export function slotToUtc(dateIso: string, hour: number): Date {
  // dateIso = "YYYY-MM-DD", hour = local hour in Mexico City
  const utcHour = hour - MEXICO_CITY_UTC_OFFSET_HOURS;
  return new Date(`${dateIso}T${String(utcHour).padStart(2, "0")}:00:00.000Z`);
}

export function formatSlotLabel(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:00 ${period}`;
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
