import type { ReactNode } from "react";
import type { AppRole } from "@/lib/appAuth";

// The areas each professional is evaluated on. Rendered as a standards-style
// rubric for now — the scoring workflow itself is not built yet.
export const EVALUATION_CRITERIA = [
  {
    key: "credentials",
    label: "Credentials",
    desc: "Verification of certifications, training, and work history.",
  },
  {
    key: "languages",
    label: "Language proficiency",
    desc: "Proficiency across each of the professional's working languages.",
  },
  {
    key: "ethics",
    label: "Ethical decision-making",
    desc: "Judgement around confidentiality, impartiality, and scope of role.",
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
    <div className={`rounded-xl border border-sand-200 bg-white ${className}`}>
      {children}
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
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
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

// Editorial "masthead" figures — serif numerals separated by warm rules,
// instead of a row of generic stat tiles.
export function Figures({
  items,
}: {
  items: { label: string; value: ReactNode; hint?: string }[];
}) {
  return (
    <Card className="flex flex-col divide-y divide-sand-200 sm:flex-row sm:divide-x sm:divide-y-0">
      {items.map((it) => (
        <div key={it.label} className="flex-1 px-6 py-5">
          <div className="font-display text-[28px] font-medium leading-none text-teal-900">
            {it.value}
          </div>
          <div className="mt-2 text-xs font-medium uppercase tracking-wider text-ink-faint">
            {it.label}
          </div>
          {it.hint && <div className="mt-1 text-xs text-ink-faint/80">{it.hint}</div>}
        </div>
      ))}
    </Card>
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
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

// A quiet, intentional placeholder for workflows still to be built — reads as
// "planned", not as a loud "coming soon" chip.
export function Planned({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-sand-300 bg-sand-100/40 p-6">
      <div className="font-display text-xs italic text-ink-faint">Planned</div>
      <h3 className="mt-1 font-display text-lg font-medium text-ink">{title}</h3>
      {description && (
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-ink-soft">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}

// Five dots, one per evaluation area — a meaningful, compact progress cue.
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
          className={`h-2 w-2 rounded-full ${i < done ? "bg-teal-600" : "bg-sand-300"}`}
        />
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 py-12 text-center text-sm text-ink-faint">{children}</div>
  );
}

// Shared table cell classes for the warm "register" look.
export const thClass =
  "px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint";
export const tdClass = "px-6 py-4 align-middle";
