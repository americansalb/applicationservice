import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { requireUser } from "@/lib/appSession";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import type { Phase0Answers } from "@/lib/phase0";
import { seedAnswersFromConfig, sanitizePhase0Config } from "@/lib/phase0Config";
import Phase0Wizard from "./Phase0Wizard";
import { ensurePlanDocumentTable } from "@/lib/ensurePlanTable";

export const dynamic = "force-dynamic";

export default async function Phase0Page() {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/portal/account/password");

  // The questionnaire belongs to the institution, so only its manager fills it
  // out. Developers review it elsewhere (a later phase); professionals never see
  // it. Both are sent back to their own dashboard.
  if (user.role !== "MANAGER") redirect("/portal");
  if (!user.organizationId) redirect("/portal");

  const org = await withDbRetry("portal.phase0.page", () =>
    prisma.organization.findUnique({
      where: { id: user.organizationId as string },
      select: {
        name: true,
        phase0Status: true,
        phase0Answers: true,
        phase0Config: true,
      },
    })
  );
  if (!org) redirect("/portal");

  // Standards are finalized: nothing to edit here. The manager dashboard shows
  // the live team track. (The finalized read-back view lands in a later phase.)
  if (org.phase0Status === "finalized") redirect("/portal");

  // Submitted and locked pending review: show a calm confirmation, not the form.
  if (org.phase0Status === "submitted") {
    return <SubmittedView orgName={org.name} />;
  }

  // Seed the questionnaire with what AALB pre-configured, then let any saved
  // answers win: once the manager has touched a field, their value stands.
  const config = sanitizePhase0Config(org.phase0Config);
  const initialAnswers: Phase0Answers = {
    ...seedAnswersFromConfig(config),
    ...((org.phase0Answers ?? {}) as Phase0Answers),
  };

  // The most recent document on file per kind, so the wizard can show
  // "Received: ..." on each document step across reloads. This lookup must never
  // block the questionnaire: if the table is missing (a migration not yet
  // applied) or the query fails, fall back to an empty map instead of crashing.
  const docsByKind: Record<string, string> = {};
  try {
    await ensurePlanDocumentTable();
    const docs = await prisma.planDocument.findMany({
      where: { organizationId: user.organizationId as string },
      orderBy: { createdAt: "desc" },
      select: { filename: true, kind: true },
    });
    // Newest-first, so the first filename seen for a kind is the latest.
    for (const d of docs) {
      if (!(d.kind in docsByKind)) docsByKind[d.kind] = d.filename;
    }
  } catch (e) {
    console.error("[portal] phase0 plan-doc lookup failed (continuing):", e);
  }

  return (
    <Phase0Wizard
      orgName={org.name}
      initialAnswers={initialAnswers}
      docsByKind={docsByKind}
      config={config}
    />
  );
}

function SubmittedView({ orgName }: { orgName: string }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="flex items-center justify-between px-5 py-4 sm:px-8">
        <span className="font-display text-lg font-semibold tracking-tight text-ink">
          AALB
        </span>
        <Link
          href="/portal"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={2} />
          Back to dashboard
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-xl text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-700/15">
            <Check className="h-7 w-7" strokeWidth={2.25} />
          </span>
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            Phase 0 submitted
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight tracking-tight text-ink">
            Thank you. Your standards are with AALB.
          </h1>
          <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
            We are reviewing how {orgName} answered and turning it into the
            standards profile your interpreters will be assessed against. You
            will hear from us once it is finalized, and your team can begin.
          </p>
          <Link
            href="/portal"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-teal-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950"
          >
            Return to dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
