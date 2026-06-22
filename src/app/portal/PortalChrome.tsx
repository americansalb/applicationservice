"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { LogoImage } from "./Brand";
import type { AppRole } from "@/lib/appAuth";

type NavItem = { label: string; href?: string };

// Only "Overview" routes anywhere today; the rest are quiet placeholders for
// the evaluation workflow still to be built.
const NAV: NavItem[] = [
  { label: "Overview", href: "/portal" },
  { label: "Evaluations" },
  { label: "Phase 0" },
  { label: "Reports" },
];

const ROLE_LABELS: Record<AppRole, string> = {
  DEVELOPER: "Developer",
  MANAGER: "Manager",
  PROFESSIONAL: "Professional",
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

  return (
    <div className="min-h-screen bg-sand-50">
      <header className="bg-teal-950 text-white">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-6">
            <div className="flex items-center gap-9">
              <Link href="/portal" aria-label="Overview" className="shrink-0">
                <LogoImage className="h-9" />
              </Link>
              <nav className="hidden items-center gap-7 md:flex">
                {NAV.map((item) => {
                  if (!item.href) {
                    return (
                      <span
                        key={item.label}
                        title="Coming soon"
                        className="cursor-default text-sm text-teal-300/40"
                      >
                        {item.label}
                        <span className="ml-1 align-super font-display text-[10px] italic text-teal-300/40">
                          soon
                        </span>
                      </span>
                    );
                  }
                  const active = pathname === "/portal";
                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`relative text-sm transition ${
                        active
                          ? "text-white"
                          : "text-teal-100/80 hover:text-white"
                      }`}
                    >
                      {item.label}
                      {active && (
                        <span className="absolute -bottom-[22px] left-0 right-0 h-0.5 rounded-full bg-clay-500" />
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight">{user.name}</p>
                <p className="text-xs text-teal-300/70">
                  {ROLE_LABELS[user.role]}
                </p>
              </div>
              <button
                onClick={logout}
                disabled={loggingOut}
                className="rounded-md border border-teal-700/70 px-3 py-1.5 text-sm font-medium text-teal-100 transition hover:bg-teal-900 disabled:opacity-60"
              >
                {loggingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 lg:px-8">{children}</main>
    </div>
  );
}
