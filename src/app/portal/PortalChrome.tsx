"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutGrid,
  Building2,
  Users,
  Workflow,
  BarChart3,
  FileText,
  CalendarClock,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoImage } from "./Brand";
import { Avatar } from "./ui";
import type { AppRole } from "@/lib/appAuth";

const ROLE_LABELS: Record<AppRole, string> = {
  DEVELOPER: "Developer",
  MANAGER: "Manager",
  PROFESSIONAL: "Professional",
};

type NavItem = { label: string; href?: string; icon: LucideIcon };

// The landing item routes to /portal (the role's dashboard); the rest are
// placeholders for workflow still to be built. Labels are role-specific so
// each person's sidebar speaks their language.
const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  DEVELOPER: [
    { label: "Overview", href: "/portal", icon: LayoutGrid },
    { label: "Institutions", icon: Building2 },
    { label: "Candidates", icon: Users },
    { label: "Reports", icon: BarChart3 },
  ],
  MANAGER: [
    { label: "Team journey", href: "/portal", icon: LayoutGrid },
    { label: "Phase 0 · Standards", href: "/portal/phase0", icon: Workflow },
    { label: "Reports", icon: BarChart3 },
  ],
  PROFESSIONAL: [
    { label: "My journey", href: "/portal", icon: LayoutGrid },
    { label: "Documents", icon: FileText },
    { label: "Schedule", icon: CalendarClock },
  ],
};

export default function PortalChrome({
  user,
  children,
}: {
  user: { name: string; email: string; role: AppRole };
  children: ReactNode;
}) {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/portal/auth/logout", { method: "POST" });
    } finally {
      router.replace("/portal/login");
      router.refresh();
    }
  }

  const NAV = NAV_BY_ROLE[user.role] ?? NAV_BY_ROLE.DEVELOPER;

  // Shared sidebar contents (used by the desktop rail and the mobile drawer).
  const railContent = (
    <>
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link href="/portal" aria-label="Overview">
          <LogoImage className="h-10" />
        </Link>
      </div>

      <div className="px-3 pt-3">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-300/45">
          Workspace
        </p>
        <nav className="space-y-1">
          {NAV.map((item) => {
            const Icon = item.icon;
            if (!item.href) {
              return (
                <div
                  key={item.label}
                  title="Coming soon"
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-teal-300/40"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    {item.label}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wide">
                    Soon
                  </span>
                </div>
              );
            }
            const active = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-white/10 font-medium text-white shadow-sm"
                    : "text-teal-100/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-clay-400" />
                )}
                <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="mt-auto p-3">
        <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 ring-1 ring-inset ring-white/5">
          <Avatar name={user.name} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-teal-300/70">
              {ROLE_LABELS[user.role]}
            </p>
          </div>
          <button
            onClick={logout}
            disabled={loggingOut}
            title="Sign out"
            className="rounded-lg p-2 text-teal-200/80 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-sand-50 lg:flex">
      {/* Mobile bar */}
      <div className="flex h-14 items-center justify-between bg-teal-950 px-4 lg:hidden">
        <LogoImage className="h-9" />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="text-teal-100"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop rail: the teal column stretches to the full page height, while
          the inner panel sticks so the nav stays in view as the page scrolls. */}
      <aside className="hidden w-64 shrink-0 bg-teal-950 lg:block">
        <div className="sticky top-0 flex h-screen flex-col text-teal-50">
          {railContent}
        </div>
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-teal-950 text-teal-50">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-3 z-10 rounded-md p-1 text-teal-100 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            {railContent}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
