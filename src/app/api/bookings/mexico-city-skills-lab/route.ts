import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
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

export async function GET() {
  const bookings = await prisma.interviewBooking.findMany({
    where: { jobSlug: SKILLS_LAB_LEADER_BOOKING_SLUG },
    select: { slotStart: true },
  });
  const taken = bookings.map((b) => b.slotStart.toISOString());
  return NextResponse.json({ taken });
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

  try {
    const booking = await prisma.interviewBooking.create({
      data: {
        jobSlug: SKILLS_LAB_LEADER_BOOKING_SLUG,
        slotStart,
        fullName,
        email,
        phone,
        notes,
      },
    });

    try {
      await sendEmail(
        email,
        "AALB Skills Lab Leader — In-Person Interview Confirmed",
        `<p>Hi ${escapeHtml(fullName)},</p>
         <p>Your in-person interview for the <strong>Skills Lab Leader</strong> role is confirmed for:</p>
         <p><strong>${formatDateLabel(dateIso)} at ${formatSlotLabel(hour)} (Mexico City time)</strong></p>
         <p>We'll send you the exact location and any additional details by email closer to your slot.</p>
         <p>If you need to reschedule, reply to this email.</p>
         <p>— AALB Hiring Team</p>`
      );
    } catch (e) {
      console.error("Failed to send booking confirmation:", e);
    }

    return NextResponse.json({ id: booking.id, ok: true }, { status: 201 });
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "P2002") {
      return NextResponse.json(
        { error: "That slot was just taken. Please pick another." },
        { status: 409 }
      );
    }
    console.error("Booking error:", e);
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
