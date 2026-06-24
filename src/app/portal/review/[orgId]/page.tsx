import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, FileText, ExternalLink } from "lucide-react";
import { requireUser } from "@/lib/appSession";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import PortalChrome from "../../PortalChrome";
import ResetPhase0Button from "./ResetPhase0Button";
import {
  SECTIONS,
  visibleQuestions,
  resolveOptions,
  isAnswered,
  type Phase0Answers,
  type Phase0Question,
  type Phase0Ctx,
} from "@/lib/phase0";
import { getMetroProfile } from "@/lib/metroData";

export const dynamic = "force-dynamic";

// AALB's side of the language access plan: a reviewer can see an institution's
// saved Phase 0 progress and open the exact file they uploaded, at any point,
// including while the manager is still mid-questionnaire (answers autosave, so
// what is here is what they have entered so far).
export default async function ReviewPage({
  params,
}: {
  params: { orgId: string };
}) {
  const user = await requireUser();
  if (user.mustChangePassword) redirect("/portal/account/password");
  // Reviewing institutions is an AALB (developer) capability.
  if (user.role !== "DEVELOPER") redirect("/portal");

  const org = await withDbRetry("portal.review.org", () =>
    prisma.organization.findUnique({
      where: { id: params.orgId },
      select: {
        id: true,
        name: true,
        phase0Status: true,
        phase0Answers: true,
        standardsAlignedAt: true,
      },
    })
  );
  if (!org) notFound();

  // Tolerate the plan document table being absent (a migration not yet applied)
  // so the review page still renders the saved answers instead of crashing.
  type ReviewDoc = {
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    uploadedVia: string;
    uploaderName: string | null;
    createdAt: Date;
  };
  let docs: ReviewDoc[] = [];
  try {
    docs = await prisma.planDocument.findMany({
      where: { organizationId: org.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        mimeType: true,
        sizeBytes: true,
        uploadedVia: true,
        uploaderName: true,
        createdAt: true,
      },
    });
  } catch (e) {
    console.error("[portal] review plan-doc list failed (continuing):", e);
  }

  const answers = (org.phase0Answers ?? {}) as Phase0Answers;
  const ctx: Phase0Ctx = { orgName: org.name };
  const summary = buildSummary(answers, ctx);
  const visibleNonInfo = visibleQuestions(answers, ctx).filter(
    (q) => q.type !== "info"
  );
  const answeredCount = visibleNonInfo.filter((q) =>
    isAnswered(q, answers)
  ).length;
  const planLink =
    typeof answers["plan.link"] === "string"
      ? (answers["plan.link"] as string)
      : "";

  return (
    <PortalChrome
      user={{ name: user.name, email: user.email, role: user.role }}
    >
      <Link
        href="/portal"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-soft transition hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={2} />
        Back to overview
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            Phase 0 review
          </p>
          <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-ink">
            {org.name}
          </h1>
          <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
            {org.standardsAlignedAt
              ? "Standards are finalized and active."
              : `${answeredCount} of ${visibleNonInfo.length} questions answered so far.`}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <StatusChip status={org.phase0Status} aligned={!!org.standardsAlignedAt} />
          <ResetPhase0Button orgId={org.id} orgName={org.name} />
        </div>
      </div>

      {/* The uploaded plan document(s) */}
      <section className="mt-7">
        <h2 className="mb-3 font-display text-base font-medium text-ink">
          Language access plan document
        </h2>
        {docs.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 text-sm text-ink-soft shadow-card">
            No file uploaded yet.
            {planLink ? (
              <>
                {" "}
                The institution provided a link instead:{" "}
                <a
                  href={planLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-teal-700 underline underline-offset-2"
                >
                  {planLink}
                </a>
              </>
            ) : (
              " It may arrive later, or the institution may not have a written plan."
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 shadow-card"
              >
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-700/15">
                  <FileText className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-[12rem] flex-1">
                  <p className="font-medium text-ink">{d.filename}</p>
                  <p className="text-sm text-ink-soft">
                    {fmtType(d.mimeType)} · {fmtSize(d.sizeBytes)} ·{" "}
                    {d.uploadedVia === "link"
                      ? `via emailed link${d.uploaderName ? ` by ${d.uploaderName}` : ""}`
                      : "uploaded by the manager"}{" "}
                    · {fmtDate(d.createdAt)}
                  </p>
                </div>
                <a
                  href={`/api/portal/phase0/plan/${d.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-950"
                >
                  <ExternalLink className="h-4 w-4" strokeWidth={2} />
                  View file
                </a>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Saved answers, read back by section */}
      <section className="mt-8">
        <h2 className="mb-3 font-display text-base font-medium text-ink">
          Their responses
        </h2>
        {summary.length === 0 ? (
          <div className="rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 text-sm text-ink-soft shadow-card">
            Nothing answered yet.
          </div>
        ) : (
          <div className="space-y-4">
            {summary.map((sec) => (
              <div
                key={sec.title}
                className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-card"
              >
                <div className="border-b border-zinc-200/70 px-5 py-3">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.16em] text-teal-700">
                    {sec.title}
                  </h3>
                </div>
                <dl className="divide-y divide-zinc-100">
                  {sec.items.map((it) => (
                    <div
                      key={it.id}
                      className="px-5 py-3.5 sm:flex sm:items-baseline sm:gap-6"
                    >
                      <dt className="text-sm text-ink-soft sm:w-1/2 sm:shrink-0">
                        {it.prompt}
                      </dt>
                      <dd
                        className={`mt-1 text-[15px] text-ink sm:mt-0 sm:flex-1 ${
                          it.long ? "whitespace-pre-wrap" : "font-medium"
                        }`}
                      >
                        {it.value || "—"}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>
    </PortalChrome>
  );
}

function StatusChip({
  status,
  aligned,
}: {
  status: string;
  aligned: boolean;
}) {
  if (aligned) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 ring-1 ring-inset ring-teal-700/15">
        <span className="h-1.5 w-1.5 rounded-full bg-teal-600" />
        Finalized
      </span>
    );
  }
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-clay-100 px-3 py-1.5 text-xs font-semibold text-clay-700 ring-1 ring-inset ring-clay-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-clay-500" />
        Ready to review
      </span>
    );
  }
  const label =
    status === "in_progress" ? "In progress" : "Not started";
  return (
    <span className="inline-flex items-center rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-ink-soft ring-1 ring-inset ring-zinc-300">
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Read-back of saved answers.
// ---------------------------------------------------------------------------

type SummaryItem = { id: string; prompt: string; value: string; long: boolean };
type SummarySection = { title: string; items: SummaryItem[] };

function optionLabel(
  q: Phase0Question,
  value: string,
  a: Phase0Answers,
  ctx: Phase0Ctx
): string {
  return resolveOptions(q, a, ctx).find((o) => o.value === value)?.label ?? value;
}

function formatAnswer(
  q: Phase0Question,
  a: Phase0Answers,
  ctx: Phase0Ctx
): string {
  const v = a[q.id];
  if (q.type === "multi_select") {
    const arr = Array.isArray(v) ? (v as string[]) : [];
    if (q.widget === "metro")
      return arr.map((s) => getMetroProfile(s)?.name ?? s).join(", ");
    if (q.widget === "language") return arr.join(", ");
    return arr.map((val) => optionLabel(q, val, a, ctx)).join(", ");
  }
  if (q.type === "single_select") return optionLabel(q, String(v), a, ctx);
  return String(v ?? "");
}

function buildSummary(a: Phase0Answers, ctx: Phase0Ctx): SummarySection[] {
  const visible = visibleQuestions(a, ctx);
  return SECTIONS.map((sec) => ({
    title: sec.title,
    items: visible
      .filter((q) => q.section === sec.id && q.type !== "info" && isAnswered(q, a))
      .map((q) => ({
        id: q.id,
        prompt: q.prompt,
        value: formatAnswer(q, a, ctx),
        long: q.type === "long_text",
      })),
  })).filter((s) => s.items.length > 0);
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

function fmtType(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime.includes("wordprocessingml") || mime === "application/msword")
    return "Word";
  if (mime === "image/png") return "PNG";
  if (mime === "image/jpeg") return "JPG";
  return mime;
}

function fmtDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
