"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Wordmark } from "./Brand";
import { RoleBadge, SoonPill } from "./ui";
import type { AppRole } from "@/lib/appAuth";

type NavItem = { label: string; href?: string };

// Only "Dashboard" routes anywhere today; the rest are placeholders for the
// evaluation workflow still to be built.
const NAV: NavItem[] = [
  { label: "Dashboard", href: "/portal" },
  { label: "Evaluations" },
  { label: "Phase 0 Setup" },
  { label: "Reports" },
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-teal-950 text-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            <Link href="/portal" aria-label="Dashboard">
              <Wordmark />
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              {NAV.map((item) => {
                const active = item.href === "/portal" && pathname === "/portal";
                if (!item.href) {
                  return (
                    <span
                      key={item.label}
                      className="flex cursor-default items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-teal-300/60"
                      title="Coming soon"
                    >
                      {item.label}
                      <SoonPill />
                    </span>
                  );
                }
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-teal-800/60 text-white"
                        : "text-teal-100 hover:bg-teal-900/60 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight">{user.name}</p>
              <p className="text-xs text-teal-300/80">{user.email}</p>
            </div>
            <RoleBadge role={user.role} />
            <button
              onClick={logout}
              disabled={loggingOut}
              className="rounded-md border border-teal-700 px-3 py-1.5 text-sm font-medium text-teal-100 transition hover:bg-teal-900 disabled:opacity-60"
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
