"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-sand-300 bg-white px-3.5 py-2.5 text-ink shadow-sm outline-none transition focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";

export default function ChangePasswordForm({
  mustChange,
}: {
  mustChange: boolean;
}) {
  const router = useRouter();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError("New password and confirmation do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/portal/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not update your password.");
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
    <div className="rounded-2xl border border-sand-200/80 bg-white p-6 shadow-card sm:p-8">
      {mustChange && (
        <div className="mb-5 rounded-lg border border-clay-500/30 bg-clay-100 px-4 py-3 text-sm text-clay-700">
          For security, please set a new password before continuing.
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-lg border border-clay-500/30 bg-clay-100 px-4 py-3 text-sm text-clay-700">
          {error}
        </div>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="current" className="block text-sm font-medium text-ink-soft">
            Current password
          </label>
          <input
            id="current"
            type="password"
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="next" className="block text-sm font-medium text-ink-soft">
            New password
          </label>
          <input
            id="next"
            type="password"
            autoComplete="new-password"
            required
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs text-ink-faint">
            At least 10 characters, with upper- and lower-case letters, a number,
            and a symbol.
          </p>
        </div>
        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-ink-soft">
            Confirm new password
          </label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950 disabled:opacity-60"
        >
          {loading ? "Saving…" : "Save password"}
        </button>
      </form>
    </div>
  );
}
