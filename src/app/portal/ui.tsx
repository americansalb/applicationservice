import type { ReactNode } from "react";
import type { AppRole } from "@/lib/appAuth";

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

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="px-6 py-14 text-center text-sm text-ink-faint">{children}</div>
  );
}

export const thClass =
  "px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint";
export const tdClass = "px-6 py-4 align-middle";
