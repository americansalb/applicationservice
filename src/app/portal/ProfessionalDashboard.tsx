import { Lock, Award } from "lucide-react";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import { ASSESSMENT_STEPS } from "./ui";
import StepActionButton from "./StepActionButton";
import type { SessionUser } from "@/lib/appSession";

const STEP1_REQUIREMENTS = [
  <>A national certification — <span className="font-medium">CCHI, NBCMI, or RID</span></>,
  <>Proof of a <span className="font-medium">40-hour medical interpreter training</span> program</>,
  <>Your verified work history</>,
];

export default async function ProfessionalDashboard({
  user,
}: {
  user: SessionUser;
}) {
  const firstName = user.name.split(" ")[0] || user.name;

  let orgName = "your institution";
  let aligned = false;
  if (user.organizationId) {
    try {
      const org = await withDbRetry("portal.pro.org", () =>
        prisma.organization.findUnique({
          where: { id: user.organizationId as string },
          select: { name: true, standardsAlignedAt: true },
        })
      );
      if (org) {
        orgName = org.name;
        aligned = !!org.standardsAlignedAt;
      }
    } catch (e) {
      console.error("[portal] professional org load failed:", e);
    }
  }

  const locked = ASSESSMENT_STEPS.slice(1);

  return (
    <div className="-mx-5 -my-8 sm:-mx-8 lg:-mx-12 lg:-my-12">
      {/* HERO */}
      <div className="relative overflow-hidden bg-teal-950 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(90% 70% at 12% 0%, rgba(45,212,191,0.16), transparent 55%)",
          }}
        />
        <div className="relative mx-auto max-w-4xl px-6 pb-10 pt-12 sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-teal-300/80">
            Medical interpreter qualification
          </p>
          <h1 className="mt-2 font-display text-[32px] font-medium leading-tight tracking-tight sm:text-[34px]">
            You&rsquo;re on your way, {firstName}.
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-teal-100/80">
            Five steps stand between you and your{" "}
            <span className="font-medium text-white">Verification of Qualification</span>{" "}
            — recognized for two years across {orgName}.
          </p>

          {/* journey ribbon */}
          <div className="mt-9 flex items-center overflow-x-auto pb-1">
            {ASSESSMENT_STEPS.map((s, i) => (
              <div key={s.code} className="flex shrink-0 items-center">
                {i > 0 && <div className="h-0.5 w-8 bg-white/15 sm:w-12" />}
                <div
                  className={
                    i === 0
                      ? "flex h-11 w-11 items-center justify-center rounded-full bg-teal-300 font-display text-base font-semibold text-teal-950 shadow-[0_0_0_5px_rgba(94,234,212,0.18)]"
                      : "flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-[13px] font-medium text-teal-100/70 ring-1 ring-inset ring-white/15"
                  }
                >
                  {s.code}
                </div>
              </div>
            ))}
            <div className="h-0.5 w-8 bg-gradient-to-r from-white/15 to-teal-300/40 sm:w-12" />
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-300 to-teal-500 text-teal-950 ring-4 ring-white/10">
              <Award className="h-6 w-6" strokeWidth={1.75} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1 font-medium text-teal-50 ring-1 ring-inset ring-white/15">
              Step 1 of 5
            </span>
            <span className="text-teal-100/70">
              {aligned
                ? "Just getting started — let's complete your credentials."
                : `${orgName} is finalizing its assessment standards — your first step opens soon.`}
            </span>
          </div>
        </div>
      </div>

      {/* TRAIL */}
      <div className="mx-auto max-w-4xl px-6 py-10 sm:px-10">
        <div className="relative pl-10">
          <div className="absolute bottom-10 left-[18px] top-2 w-0.5 bg-sand-300" />

          {/* Step 0 — institution foundation */}
          <div className="relative mb-7">
            <div className="absolute -left-10 top-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-faint ring-2 ring-sand-300">
              {aligned ? "✓" : "0"}
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Step 0 · Set by your institution
            </p>
            <p className="mt-0.5 text-sm text-ink-soft">
              {aligned
                ? `${orgName}'s assessment standards are in place. Your evaluation is scored against them.`
                : `${orgName} is completing Phase 0 with AALB. Your assessment opens once their standards are set.`}
            </p>
          </div>

          {/* Step 1 — active */}
          <div className="relative mb-6">
            <div className="absolute -left-10 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 font-display text-sm font-semibold text-white shadow-[0_0_0_5px_rgba(13,148,136,0.15)]">
              1
            </div>
            <div className="overflow-hidden rounded-2xl border border-teal-700/20 bg-white shadow-raised">
              <div className="border-b border-sand-200/70 bg-teal-50/50 px-6 py-3">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-600 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white">
                    Your next step
                  </span>
                  <span className="text-xs text-ink-faint">Step 1 of 5</span>
                </div>
              </div>
              <div className="px-6 py-5">
                <h2 className="font-display text-xl font-semibold text-ink">
                  Credential verification
                </h2>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
                  We&rsquo;ll verify your professional credentials before any skills
                  assessment begins. Have these ready:
                </p>
                <ul className="mt-4 space-y-2.5">
                  {STEP1_REQUIREMENTS.map((r, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-ink">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[11px] text-teal-700">
                        {i + 1}
                      </span>
                      {r}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  {aligned ? (
                    <div className="flex flex-wrap items-center gap-4">
                      <StepActionButton label="Begin credential verification" />
                      <span className="text-xs text-ink-faint">
                        We&rsquo;ll guide you through each requirement
                      </span>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-sand-50 px-4 py-3 text-sm text-ink-soft ring-1 ring-inset ring-sand-200">
                      This step opens once {orgName} completes Phase 0. We&rsquo;ll
                      email you the moment it&rsquo;s ready.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Locked steps */}
          {locked.map((s) => (
            <div key={s.code} className="relative mb-5 opacity-70">
              <div className="absolute -left-10 top-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-white text-ink-faint ring-2 ring-sand-300">
                <Lock className="h-3.5 w-3.5" strokeWidth={2} />
              </div>
              <p className="text-sm font-semibold text-ink">
                Step {s.code} · {s.name}
              </p>
              <p className="mt-0.5 text-sm text-ink-soft">{s.desc}</p>
            </div>
          ))}

          {/* Goal */}
          <div className="relative mt-8">
            <div className="absolute -left-[46px] top-0 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-700 to-teal-950 text-teal-200 ring-4 ring-sand-50">
              <Award className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="ml-1 rounded-2xl border border-dashed border-teal-700/30 bg-teal-50/40 px-6 py-5">
              <p className="font-display text-lg font-semibold text-teal-900">
                Verification of Qualification
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                Earn it by completing all five steps. Recognized for two years; AALB
                notifies you 90 days before it&rsquo;s due for renewal.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
