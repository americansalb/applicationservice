"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

type Manager = { id: string; name: string };

function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%^&*?";
  const all = upper + lower + digits + special;
  const pick = (set: string) => set[Math.floor(Math.random() * set.length)];
  let pw = pick(upper) + pick(lower) + pick(digits) + pick(special);
  for (let i = 0; i < 10; i++) pw += pick(all);
  return pw
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export default function CreateUserForm({
  mode,
  managers = [],
}: {
  mode: "developer" | "manager";
  managers?: Manager[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"MANAGER" | "PROFESSIONAL">("PROFESSIONAL");
  const [managerId, setManagerId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function reset() {
    setName("");
    setEmail("");
    setRole("PROFESSIONAL");
    setManagerId("");
    setPassword("");
    setError(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      const res = await fetch("/api/portal/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role: mode === "manager" ? "PROFESSIONAL" : role,
          managerId: managerId || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not create the account.");
        setLoading(false);
        return;
      }
      setSuccess(
        `Account created for ${data.user.email}. They set their own password on first sign-in.`
      );
      reset();
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const showManagerPicker = mode === "developer" && role === "PROFESSIONAL";

  return (
    <>
      <button
        onClick={() => {
          reset();
          setSuccess(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        {mode === "manager" ? "Add professional" : "Add account"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
          <div
            className="fixed inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg rounded-2xl border border-sand-200 bg-white shadow-panel">
            <div className="flex items-center justify-between border-b border-sand-200/70 px-6 py-4">
              <h3 className="font-display text-lg font-medium text-ink">
                {mode === "manager" ? "Add a professional" : "Add an account"}
              </h3>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-md p-1 text-ink-faint transition hover:bg-sand-100 hover:text-ink"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={onSubmit} className="p-6">
              {error && (
                <div className="mb-4 rounded-lg border border-clay-500/30 bg-clay-100 px-3 py-2 text-sm text-clay-700">
                  {error}
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="Jordan Rivera"
                  />
                </Field>

                <Field label="Email">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder="jordan@organization.org"
                  />
                </Field>

                {mode === "developer" && (
                  <Field label="Role">
                    <select
                      value={role}
                      onChange={(e) =>
                        setRole(e.target.value as "MANAGER" | "PROFESSIONAL")
                      }
                      className={inputClass}
                    >
                      <option value="PROFESSIONAL">Professional</option>
                      <option value="MANAGER">Manager</option>
                    </select>
                  </Field>
                )}

                {showManagerPicker && (
                  <Field label="Assign to manager (optional)">
                    <select
                      value={managerId}
                      onChange={(e) => setManagerId(e.target.value)}
                      className={inputClass}
                    >
                      <option value="">Unassigned</option>
                      {managers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                <Field label="Temporary password" full>
                  <div className="flex gap-2">
                    <input
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={inputClass}
                      placeholder="10+ characters, mixed case, number and symbol"
                    />
                    <button
                      type="button"
                      onClick={() => setPassword(generatePassword())}
                      className="shrink-0 rounded-lg border border-sand-300 px-3 text-sm font-medium text-ink-soft transition hover:bg-sand-100"
                    >
                      Generate
                    </button>
                  </div>
                </Field>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-4 py-2.5 text-sm font-medium text-ink-soft transition hover:bg-sand-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950 disabled:opacity-60"
                >
                  {loading ? "Creating" : "Create account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {success && (
        <div className="mt-3 rounded-lg border border-teal-700/20 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {success}
        </div>
      )}
    </>
  );
}

const inputClass =
  "block w-full rounded-lg border border-sand-300 bg-white px-3 py-2.5 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink-faint/60 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15";

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}
