"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

// Developer control to mark an institution's Phase 0 standards aligned (or
// revert). Flipping it unlocks Step 1 for that institution's interpreters.
export default function StandardsToggle({
  orgId,
  aligned,
}: {
  orgId: string;
  aligned: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function set(next: boolean) {
    setBusy(true);
    try {
      const res = await fetch(
        `/api/portal/orgs/${encodeURIComponent(orgId)}/standards`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aligned: next }),
        }
      );
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (aligned) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-800 ring-1 ring-inset ring-teal-700/15">
          <Check className="h-3 w-3" strokeWidth={2.5} /> Standards active
        </span>
        <button
          onClick={() => set(false)}
          disabled={busy}
          className="text-xs font-medium text-ink-faint underline-offset-2 hover:underline disabled:opacity-50"
        >
          Undo
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => set(true)}
      disabled={busy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-sand-300 px-3 py-1.5 text-xs font-semibold text-ink-soft transition hover:bg-sand-100 disabled:opacity-50"
    >
      {busy ? "Saving…" : "Mark standards aligned"}
    </button>
  );
}
