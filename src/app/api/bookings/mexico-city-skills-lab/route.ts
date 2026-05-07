import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPool, resetPool } from "@/lib/pg";
import { isConnectivityError, withDbRetry } from "@/lib/dbRetry";
import { sendEmail } from "@/lib/email";
import {
  BOOKING_DATES,
  BOOKING_HOURS,
  SKILLS_LAB_LEADER_BOOKING_SLUG,
  formatDateLabel,
  formatSlotLabel,
  slotToUtc,
} from "@/lib/skillsLabLeader";

export const dynamic = "force-dynamic";

function queryWithRetry<T>(label: string, fn: (pool: ReturnType<typeof getPool>) => Promise<T>): Promise<T> {
  return withDbRetry(label, () => fn(getPool()), () => resetPool());
}

export async function GET() {
  try {
    const result = await queryWithRetry("bookings.GET", (pool) => pool.query<{ slotStart: Date }>(
      `SELECT "slotStart" FROM "careers_interview_booking" WHERE "jobSlug" = $1`,
      [SKILLS_LAB_LEADER_BOOKING_SLUG]
    ));
    const taken = result.rows
      .map((r) => r.slotStart)
      .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime()))
      .map((d) => d.toISOString());
    return NextResponse.json({ taken });
  } catch (e) {
    console.error("Failed to load bookings:", e);
    // Return an empty list so the page still renders. Worst case: a user
    // double-books a slot and the POST returns 409.
    return NextResponse.json({ taken: [] });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  const dateIso = String(body.date || "");
  const hour = Number(body.hour);

  if (!fullName || !email || !phone) {
    return NextResponse.json(
      { error: "Full name, email, and phone are required" },
      { status: 400 }
    );
  }
  if (!BOOKING_DATES.includes(dateIso)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }
  if (!BOOKING_HOURS.includes(hour)) {
    return NextResponse.json({ error: "Invalid time slot" }, { status: 400 });
  }

  const slotStart = slotToUtc(dateIso, hour);
  const id = crypto.randomUUID();

  try {
    await queryWithRetry("bookings.POST", (pool) => pool.query(
      `INSERT INTO "careers_interview_booking"
         ("id", "jobSlug", "slotStart", "fullName", "email", "phone", "notes", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [id, SKILLS_LAB_LEADER_BOOKING_SLUG, slotStart, fullName, email, phone, notes]
    ));

    try {
      await sendEmail(
        email,
        "AALB Skills Lab Leader — In-Person Interview Confirmed (Mexico City)",
        `<p>Hi ${escapeHtml(fullName)},</p>
         <p>Your <strong>in-person</strong> interview for the <strong>Skills Lab Leader</strong> role is confirmed.</p>
         <p style="font-size:16px;"><strong>${formatDateLabel(dateIso)} at ${formatSlotLabel(hour)}</strong><br/>
         <em>Mexico City local time · in person</em></p>
         <p><strong>Please arrive on time.</strong> This is a 1-hour slot — plan to arrive a few minutes early. Mexico City traffic can be unpredictable, so give yourself extra buffer. We may not be able to accommodate late arrivals on the same day.</p>
         <p>We'll email the exact location and any final details closer to your slot.</p>
         <p>If you need to reschedule or can no longer attend, reply to this email as soon as you can.</p>
         <p>— AALB Hiring Team</p>`
      );
    } catch (e) {
      console.error("Failed to send booking confirmation:", e);
    }

    return NextResponse.json({ id, ok: true }, { status: 201 });
  } catch (e: unknown) {
    // pg unique-violation = 23505 (matches the
    // careers_interview_booking_jobSlug_slotStart_key constraint)
    const code = (e as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json(
        { error: "That slot was just taken. Please pick another." },
        { status: 409 }
      );
    }
    console.error("Booking error:", e);
    if (isConnectivityError(e)) {
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
