import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import GatedRound from "./GatedRound";

export const dynamic = "force-dynamic";

// Per-candidate gated link — never index.
export const metadata: Metadata = {
  title: "Your interview",
  robots: { index: false, follow: false },
};

export default async function RoundAccessPage({
  params,
}: {
  params: { token: string };
}) {
  // Quick existence check for a clean 404; the client fetches full data.
  let exists = false;
  try {
    const access = await prisma.interviewAccess.findUnique({
      where: { token: params.token },
      select: { id: true },
    });
    exists = !!access;
  } catch (e) {
    console.error("Access page lookup failed:", e);
    // Let the client surface a retriable error rather than 404 on a DB blip.
    exists = true;
  }

  if (!exists) notFound();

  return <GatedRound token={params.token} />;
}
