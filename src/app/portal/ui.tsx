import type { ReactNode } from "react";
import { AlertTriangle, Award, Lock, Check } from "lucide-react";
import type { AppRole } from "@/lib/appAuth";

// The candidate's qualification journey — the five sequential steps every
// medical interpreter completes, per the AALB assessment agreement. Step 0
// (institutional standards) is a prerequisite handled at the organization
// level, not a candidate step, so it isn't in this list.
export const ASSESSMENT_STEPS = [
  {
    code: "1",
    short: "Credentials",
    name: "Credential verification",
    desc: "National certification (CCHI, NBCMI, or RID) and a 40-hour medical interpreter training program.",
  },
  {
    code: "2",
    short: "Proficiency",
    name: "Language proficiency",
    desc: "Speaking and listening in each working language, assessed to the ILR 3+ standard.",
  },
  {
    code: "3A",
    short: "Knowledge",
    name: "Knowledge examination",
    desc: "Proctored exam on ethics, role boundaries, HIPAA, and medical terminology. Pass ≥ 80%.",
  },
  {
    code: "3B",
    short: "Simulated",
    name: "Simulated skills assessment",
    desc: "Recorded, high-fidelity medical encounter scenarios scored by expert evaluators.",
  },
  {
    code: "3C",
    short: "Live",
    name: "Live skills observation",
    desc: "Supervised observation in a real clinical setting — on-site or by video.",
  },
] as const;

export const TOTAL_STEPS = ASSESSMENT_STEPS.length;

// The areas each professional is evaluated on. Rendered as a standards-style
// rubric for now; the scoring workflow itself is not built yet.
export const EVALUATION_CRITERIA = [
  {
    key: "credentials",
    label: "Credentials",
    desc: "Certifications, training, and verified work history.",
  },
  {
    key: "languages",
    label: "Language proficiency",
    desc: "Proficiency across each working language.",
  },
  {
    key: "ethics",
    label: "Ethical decision-making",
    desc: "Confidentiality, impartiality, and scope of role.",
  },
  {
    key: "virtual",
    label: "Virtual performance",
    desc: "Interpreting performance in remote and video settings.",
  },
  {
    key: "live",
    label: "Live performance",
    desc: "Interpreting performance in live, in-person settings.",
  },
] as const;

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-sand-200/80 bg-white shadow-card ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-sand-200/70 px-6 py-4">
      <div>
        <h3 className="font-display text-base font-medium text-ink">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-ink-faint">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function PageHeading({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="font-display text-[28px] font-semibold leading-tight tracking-tight text-ink">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-ink-soft">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
          {label}
        </span>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 font-display text-[30px] font-semibold leading-none text-ink">
        {value}
      </div>
      {hint && <div className="mt-2 text-sm text-ink-faint">{hint}</div>}
    </Card>
  );
}

function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export function Avatar({
  name,
  tone = "teal",
  className = "",
}: {
  name: string;
  tone?: "teal" | "clay";
  className?: string;
}) {
  const tones = {
    teal: "bg-teal-50 text-teal-800 ring-teal-900/10",
    clay: "bg-clay-100 text-clay-700 ring-clay-600/15",
  } as const;
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset ${tones[tone]} ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}

export function RoleBadge({ role }: { role: AppRole }) {
  const styles: Record<AppRole, string> = {
    DEVELOPER: "bg-teal-50 text-teal-800 ring-teal-700/15",
    MANAGER: "bg-clay-100 text-clay-700 ring-clay-600/20",
    PROFESSIONAL: "bg-sand-100 text-ink-soft ring-sand-300",
  };
  const labels: Record<AppRole, string> = {
    DEVELOPER: "Developer",
    MANAGER: "Manager",
    PROFESSIONAL: "Professional",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${styles[role]}`}
    >
      {labels[role]}
    </span>
  );
}

export function StatusTag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "pending" | "teal";
}) {
  const tones = {
    neutral: "bg-sand-100 text-ink-faint ring-sand-300",
    pending: "bg-clay-100 text-clay-700 ring-clay-600/20",
    teal: "bg-teal-50 text-teal-800 ring-teal-700/15",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

// A quiet, intentional placeholder for workflows still to be built.
export function Planned({
  icon,
  title,
  description,
  children,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-sand-100 text-ink-faint">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-medium text-ink">
              {title}
            </h3>
            <span className="rounded-full bg-sand-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint ring-1 ring-inset ring-sand-300">
              Planned
            </span>
          </div>
          {description && (
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
              {description}
            </p>
          )}
          {children}
        </div>
      </div>
    </Card>
  );
}

// One dot per evaluation area: a compact, meaningful progress cue.
export function CriteriaDots({
  done = 0,
  total = EVALUATION_CRITERIA.length,
}: {
  done?: number;
  total?: number;
}) {
  return (
    <div
      className="flex items-center gap-1.5"
      title={`${done} of ${total} areas complete`}
    >
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1.5 w-4 rounded-full ${i < done ? "bg-teal-600" : "bg-sand-300"}`}
        />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {icon && (
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-sand-100 text-ink-faint ring-1 ring-inset ring-sand-200">
          {icon}
        </span>
      )}
      <p className="text-sm text-ink-faint">{children}</p>
    </div>
  );
}

// Shown in place of content when a data load fails, instead of a hard 500.
export function LoadError({ label = "this section" }: { label?: string }) {
  return (
    <Card className="flex flex-col items-center px-6 py-12 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-clay-100 text-clay-600 ring-1 ring-inset ring-clay-500/20">
        <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
      </span>
      <p className="text-sm font-medium text-ink">Couldn&apos;t load {label}</p>
      <p className="mt-1 text-sm text-ink-faint">
        This is usually temporary. Please refresh to try again.
      </p>
    </Card>
  );
}

export const thClass =
  "px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint";
export const tdClass = "px-6 py-4 align-middle";

// The shared qualification track: the five steps as a horizontal path ending
// in the Verification seal. `current` is the index of the step in progress
// (0 = Step 1). Optional `avatars` cluster above the current node (the manager
// sees their team riding the same track); `dim` renders it locked/awaiting.
export function JourneyTrack({
  current = 0,
  avatars = [],
  dim = false,
}: {
  current?: number;
  avatars?: string[];
  dim?: boolean;
}) {
  return (
    <div className={`relative px-6 pb-4 pt-12 sm:px-10 ${dim ? "opacity-55" : ""}`}>
      <div className="absolute left-[44px] right-[64px] top-[78px] h-[3px] rounded-full bg-sand-300 sm:left-[60px] sm:right-[80px]" />
      <div className="relative flex items-start justify-between">
        {ASSESSMENT_STEPS.map((s, i) => {
          const done = i < current;
          const isCurrent = i === current;
          return (
            <div key={s.code} className="relative flex w-14 flex-col items-center sm:w-16">
              {isCurrent && avatars.length > 0 && (
                <div className="absolute -top-11 flex items-center">
                  {avatars.slice(0, 4).map((n, j) => (
                    <span
                      key={j}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-700 text-[10px] font-semibold text-white ring-2 ring-white ${j > 0 ? "-ml-2" : ""}`}
                    >
                      {initialsOf(n)}
                    </span>
                  ))}
                  {avatars.length > 4 && (
                    <span className="-ml-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-900 text-[10px] font-semibold text-white ring-2 ring-white">
                      +{avatars.length - 4}
                    </span>
                  )}
                </div>
              )}
              <div
                className={`z-10 flex h-7 w-7 items-center justify-center rounded-full font-display text-xs font-semibold ring-2 ${
                  done
                    ? "bg-teal-600 text-white ring-teal-600"
                    : isCurrent
                      ? "bg-teal-600 text-white ring-4 ring-white"
                      : "bg-white text-ink-faint ring-sand-300"
                }`}
              >
                {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : s.code}
              </div>
              <p
                className={`mt-2 text-[11px] font-semibold uppercase tracking-wide ${
                  isCurrent ? "text-teal-700" : "text-ink-faint"
                }`}
              >
                Step {s.code}
              </p>
              <p className="text-center text-[11px] leading-tight text-ink-faint">
                {s.short}
              </p>
            </div>
          );
        })}
        <div className="relative flex w-14 flex-col items-center sm:w-16">
          <div className="z-10 -mt-1.5 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-teal-700 to-teal-950 text-teal-200 ring-4 ring-white">
            <Award className="h-5 w-5" strokeWidth={1.75} />
          </div>
          <p className="mt-1.5 text-[11px] font-bold uppercase tracking-wide text-teal-900">
            Verified
          </p>
        </div>
      </div>
    </div>
  );
}

// A small lock chip used on awaiting/gated sections.
export function LockChip({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-2.5 py-1 text-xs font-medium text-ink-faint ring-1 ring-inset ring-sand-300">
      <Lock className="h-3 w-3" strokeWidth={2} />
      {children}
    </span>
  );
}
