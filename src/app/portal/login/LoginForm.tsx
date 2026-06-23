"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { LogoImage } from "../Brand";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Login failed. Please try again.");
        setLoading(false);
        return;
      }
      router.replace(
        data.user?.mustChangePassword ? "/portal/account/password" : "/portal"
      );
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1.05fr_0.95fr]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-teal-950 p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
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
              "radial-gradient(90% 60% at 15% 0%, rgba(45,212,191,0.16), transparent 55%)",
          }}
        />

        <LogoImage className="relative h-12" />

        <div className="relative">
          <h1 className="max-w-md font-display text-[2.5rem] font-medium leading-[1.12] tracking-tight">
            Interpreter evaluation, start to finish.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-teal-100/75">
            Assess, document, and track the qualifications of the interpreters
            serving your patients.
          </p>

          {/* Product preview */}
          <div className="mt-10 max-w-sm rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-panel backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-200/70">
              Areas of evaluation
            </p>
            <ul className="mt-3 space-y-3">
              {[
                "Credentials",
                "Language proficiency",
                "Ethical decision-making",
                "Live performance",
              ].map((label, i) => (
                <li key={label} className="flex items-center justify-between">
                  <span className="text-sm text-teal-50/90">{label}</span>
                  <span className="flex gap-1">
                    {Array.from({ length: 5 }).map((_, d) => (
                      <span
                        key={d}
                        className={`h-1.5 w-4 rounded-full ${
                          d < i ? "bg-teal-300" : "bg-white/15"
                        }`}
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="relative text-xs text-teal-300/55">
          &copy; {new Date().getFullYear()} Americans Against Language Barriers
        </p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sand-50 to-sand-100/60 px-6 py-12 sm:px-12">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <LogoImage tone="dark" className="h-11" />
          </div>

          <div className="rounded-2xl border border-sand-200/80 bg-white p-8 shadow-raised sm:p-10">
            <h2 className="font-display text-[26px] font-semibold tracking-tight text-ink">
              Sign in
            </h2>
            <p className="mt-1.5 text-[15px] text-ink-soft">
              Use the credentials provided by AALB.
            </p>

            <form onSubmit={onSubmit} className="mt-7 space-y-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-clay-500/30 bg-clay-100 px-4 py-3 text-sm text-clay-700"
                >
                  {error}
                </div>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-ink-soft"
                >
                  Email
                </label>
                <div className="relative">
                  <Mail
                    className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint"
                    strokeWidth={1.75}
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="you@organization.org"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-ink-soft"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-faint"
                    strokeWidth={1.75}
                  />
                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="Your password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex w-full items-center justify-center gap-2 rounded-lg bg-teal-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-700/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Signing in" : "Sign in"}
                {!loading && (
                  <ArrowRight
                    className="h-4 w-4 transition group-hover:translate-x-0.5"
                    strokeWidth={2}
                  />
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs leading-relaxed text-ink-faint">
            Accounts are provisioned by AALB. Contact your administrator if you
            need access.
          </p>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "block w-full rounded-lg border border-sand-300 bg-white py-2.5 pl-10 pr-3.5 text-ink shadow-sm outline-none transition placeholder:text-ink-faint/60 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";
