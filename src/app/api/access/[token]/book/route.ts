import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getPool, resetPool } from "@/lib/pg";
import { isConnectivityError, withDbRetry } from "@/lib/dbRetry";
import { sendEmail } from "@/lib/email";
import { escapeHtml, roundLabel } from "@/lib/interviews";
import { formatSlotInTz, normalizeLiveConfig, tzAbbreviation } from "@/lib/liveSlots";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { token: string } }
) {
  const access = await prisma.interviewAccess
    .findUnique({
      where: { token: params.token },
      include: { interview: { include: { job: { select: { title: true } } } } },
    })
    .catch(() => null);

  if (!access || !access.interview || !access.interview.isActive) {
    return NextResponse.json({ error: "Interview not found" }, { status: 404 });
  }
  if (access.interview.format !== "live") {
    return NextResponse.json({ error: "This round is not a live interview." }, { status: 400 });
  }
  if (access.status === "declined") {
    return NextResponse.json({ error: "This interview is closed." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const slotRaw = String(body.slot || "");
  const slot = new Date(slotRaw);
  if (Number.isNaN(slot.getTime())) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400 });
  }
  const slotIso = slot.toISOString();

  const cfg = normalizeLiveConfig(access.interview.liveConfig);
  if (!cfg.slots.includes(slotIso)) {
    return NextResponse.json({ error: "That time is no longer available." }, { status: 400 });
  }

  try {
    const result = await withDbRetry(
      "access.book",
      () =>
        getPool().query(
          `UPDATE "careers_interview_access"
             SET "bookedSlot" = $1, "status" = 'booked', "updatedAt" = NOW()
           WHERE "id" = $2`,
          [slot, access.id]
        ),
      () => resetPool()
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Booking failed" }, { status: 404 });
    }
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code;
    if (code === "23505") {
      return NextResponse.json(
        { error: "That time was just taken. Please pick another." },
        { status: 409 }
      );
    }
    console.error("Live booking error:", e);
    if (isConnectivityError(e)) {
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Booking failed" }, { status: 500 });
  }

  const { dateLabel, timeRange } = formatSlotInTz(slotIso, cfg.timeZone, cfg.durationMins);
  const tz = tzAbbreviation(slotIso, cfg.timeZone);
  try {
    await sendEmail(
      access.email,
      `AALB — ${roundLabel(access.interview.round)} booked: ${dateLabel}`,
      `<p>Hi ${escapeHtml(access.fullName)},</p>
       <p>Your <strong>live interview</strong> (${escapeHtml(roundLabel(access.interview.round))}) is booked:</p>
       <p style="font-size:16px;"><strong>${escapeHtml(dateLabel)}</strong><br/>${escapeHtml(timeRange)} (${escapeHtml(tz)})</p>
       ${cfg.locationLabel ? `<p>${escapeHtml(cfg.locationLabel)}</p>` : ""}
       <p>If you need to reschedule, reply to this email.</p>
       <p>— AALB Hiring Team</p>`
    );
  } catch (e) {
    console.error("Failed to send booking email:", e);
  }

  return NextResponse.json({ ok: true, slot: slotIso }, { status: 201 });
}
