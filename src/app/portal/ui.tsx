import type { ReactNode } from "react";
import type { AppRole } from "@/lib/appAuth";

// The evaluation criteria the service will assess. Rendered as placeholders
// for now — the actual scoring workflow is not built yet.
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
    desc: "Interpreting performance in remote / video settings.",
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
      className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}
    >
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-teal-900">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </Card>
  );
}

export function RoleBadge({ role }: { role: AppRole }) {
  const styles: Record<AppRole, string> = {
    DEVELOPER: "bg-teal-100 text-teal-800 ring-teal-600/20",
    MANAGER: "bg-amber-100 text-amber-800 ring-amber-600/20",
    PROFESSIONAL: "bg-sky-100 text-sky-800 ring-sky-600/20",
  };
  const labels: Record<AppRole, string> = {
    DEVELOPER: "Developer",
    MANAGER: "Manager",
    PROFESSIONAL: "Professional",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[role]}`}
    >
      {labels[role]}
    </span>
  );
}

export function SoonPill() {
  return (
    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 ring-1 ring-inset ring-gray-200">
      Soon
    </span>
  );
}

// A clearly-marked placeholder panel for workflows that aren't built yet.
export function ComingSoon({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="border-dashed p-6">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <SoonPill />
      </div>
      {description && (
        <p className="mt-2 max-w-prose text-sm text-gray-500">{description}</p>
      )}
      {children}
    </Card>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center text-sm text-gray-400">{children}</div>
  );
}
