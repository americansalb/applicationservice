"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  LayoutGrid,
  ClipboardCheck,
  Workflow,
  BarChart3,
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

// Only "Overview" routes anywhere today; the rest are placeholders for the
// evaluation workflow still to be built.
const NAV: NavItem[] = [
  { label: "Overview", href: "/portal", icon: LayoutGrid },
  { label: "Evaluations", icon: ClipboardCheck },
  { label: "Phase 0", icon: Workflow },
  { label: "Reports", icon: BarChart3 },
];

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

  const sidebar = (
    <div className="flex h-full flex-col bg-teal-950 text-teal-50">
      <div className="flex h-16 shrink-0 items-center px-5">
        <Link href="/portal" aria-label="Overview">
          <LogoImage className="h-8" />
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
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-white/10 font-medium text-white shadow-sm"
                    : "text-teal-100/80 hover:bg-white/5 hover:text-white"
                }`}
              >
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
    </div>
  );

  return (
    <div className="min-h-screen bg-sand-50">
      {/* Mobile bar */}
      <div className="flex h-14 items-center justify-between bg-teal-950 px-4 lg:hidden">
        <LogoImage className="h-7" />
        <button
          onClick={() => setOpen(true)}
          aria-label="Open menu"
          className="text-teal-100"
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-2 top-3 z-10 rounded-md p-1 text-teal-100 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebar}
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <main className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
          {children}
        </main>
      </div>
    </div>
  );
}
