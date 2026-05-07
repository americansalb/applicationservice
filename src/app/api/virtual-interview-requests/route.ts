import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getPool, resetPool } from "@/lib/pg";
import { isConnectivityError, withDbRetry } from "@/lib/dbRetry";
import { SKILLS_LAB_LEADER_BOOKING_SLUG } from "@/lib/skillsLabLeader";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const fullName = String(body.fullName || "").trim();
  const email = String(body.email || "").trim();
  const phone = typeof body.phone === "string" ? body.phone.trim() || null : null;
  const notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  const jobSlug = String(body.jobSlug || SKILLS_LAB_LEADER_BOOKING_SLUG);

  if (!fullName || !email) {
    return NextResponse.json(
      { error: "Full name and email are required" },
      { status: 400 }
    );
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const id = crypto.randomUUID();

  try {
    await withDbRetry(
      "virtualInterviewRequests.POST",
      () =>
        getPool().query(
          `INSERT INTO "careers_virtual_interview_request"
             ("id", "jobSlug", "fullName", "email", "phone", "notes", "createdAt")
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [id, jobSlug, fullName, email, phone, notes]
        ),
      () => resetPool()
    );
    return NextResponse.json({ id, ok: true }, { status: 201 });
  } catch (e) {
    console.error("Virtual interview request error:", e);
    if (isConnectivityError(e)) {
      return NextResponse.json(
        { error: "Service temporarily unavailable. Please try again shortly." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
