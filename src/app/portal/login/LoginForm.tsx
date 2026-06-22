"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogoImage, Wordmark } from "../Brand";

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
        {/* soft warm light, top-left — not a gradient blob */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(110% 75% at 12% 0%, rgba(94,234,212,0.12), transparent 55%)",
          }}
        />
        {/* oversized editorial quote mark */}
        <span
          aria-hidden
          className="pointer-events-none absolute -left-2 top-24 select-none font-display text-[18rem] leading-none text-teal-400/10"
        >
          &ldquo;
        </span>

        <LogoImage className="relative h-12" />

        <div className="relative max-w-md">
          <p className="font-display text-[2.6rem] font-medium leading-[1.12] tracking-tight">
            Language access is a right.
          </p>
          <p className="mt-5 text-lg leading-relaxed text-teal-100/75">
            The portal where AALB evaluates the interpreters and translators our
            partner institutions depend on — and stands behind them.
          </p>
        </div>

        <p className="relative text-xs text-teal-300/60">
          &copy; {new Date().getFullYear()} Americans Against Language Barriers
        </p>
      </div>

      {/* Form panel */}
      <div className="flex min-h-screen items-center justify-center bg-sand-50 px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden">
            <Wordmark tone="dark" />
          </div>

          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
            Sign in
          </h1>
          <p className="mt-2 text-[15px] text-ink-soft">
            Use the credentials provided by AALB.
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
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
                className="block text-sm font-medium text-ink-soft"
              >
                Email
              </label>
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

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-ink-soft"
              >
                Password
              </label>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950 focus:outline-none focus:ring-2 focus:ring-teal-700/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-10 text-xs leading-relaxed text-ink-faint">
            Accounts are provisioned by AALB. Contact your administrator if you
            need access.
          </p>
        </div>
      </div>
    </div>
  );
}

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-sand-300 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition placeholder:text-ink-faint/60 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";
