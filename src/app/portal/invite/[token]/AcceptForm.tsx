"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";

const inputClass =
  "block w-full rounded-lg border border-sand-300 bg-white py-2.5 pl-10 pr-3.5 text-ink shadow-sm outline-none transition placeholder:text-ink-faint/60 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";

export default function AcceptForm({
  token,
  email,
  name: initialName,
  orgName,
  roleLabel,
}: {
  token: string;
  email: string;
  name: string;
  orgName?: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Password and confirmation do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(
        `/api/portal/invite/${encodeURIComponent(token)}/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, password }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not complete setup.");
        setLoading(false);
        return;
      }
      router.replace("/portal");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
        Accept your invitation
      </h1>
      <p className="mt-1.5 text-[15px] leading-relaxed text-ink-soft">
        {orgName ? (
          <>
            Join <span className="font-medium text-ink">{orgName}</span> as a{" "}
            {roleLabel}.
          </>
        ) : (
          <>
            Join the AALB Evaluation Platform as a{" "}
            <span className="font-medium text-ink">{roleLabel}</span>.
          </>
        )}{" "}
        Set a password to finish creating your account.
      </p>
      <p className="mt-3 rounded-lg bg-sand-50 px-3 py-2 text-sm text-ink-soft ring-1 ring-inset ring-sand-200">
        {email}
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        {error && (
          <div
            role="alert"
            className="rounded-lg border border-clay-500/30 bg-clay-100 px-4 py-3 text-sm text-clay-700"
          >
            {error}
          </div>
        )}

        <Field label="Full name" icon={<User className="h-[18px] w-[18px]" strokeWidth={1.75} />}>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Your full name"
          />
        </Field>

        <Field label="Password" icon={<Lock className="h-[18px] w-[18px]" strokeWidth={1.75} />}>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="Choose a password"
          />
        </Field>

        <Field label="Confirm password" icon={<Lock className="h-[18px] w-[18px]" strokeWidth={1.75} />}>
          <input
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            placeholder="Re-enter your password"
          />
        </Field>

        <p className="text-xs text-ink-faint">
          At least 10 characters, with upper- and lower-case letters, a number,
          and a symbol.
        </p>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950 disabled:opacity-60"
        >
          {loading ? "Creating your account" : "Create account and sign in"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-soft">
        {label}
      </span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
          {icon}
        </span>
        {children}
      </div>
    </label>
  );
}
