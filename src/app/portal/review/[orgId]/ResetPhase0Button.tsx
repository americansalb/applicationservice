"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";

// Developer control to wipe an institution's Phase 0 so they can start over.
// Confirmed before firing, since it clears answers, the uploaded plan, and any
// finalized standards.
export default function ResetPhase0Button({
  orgId,
  orgName,
}: {
  orgId: string;
  orgName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function reset() {
    const ok = window.confirm(
      `Reset Phase 0 for ${orgName}?\n\nThis permanently clears their saved answers, removes the uploaded plan, and undoes any finalized standards so they start over. This cannot be undone.`
    );
    if (!ok) return;
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/portal/phase0/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d?.error || "Reset failed.");
      }
      router.refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={reset}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-clay-600/30 px-3 py-1.5 text-xs font-semibold text-clay-700 transition hover:bg-clay-100 disabled:opacity-50"
      >
        <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
        {busy ? "Resetting…" : "Reset Phase 0"}
      </button>
      {err && <span className="text-xs font-medium text-clay-600">{err}</span>}
    </div>
  );
}
