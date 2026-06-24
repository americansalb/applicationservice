"use client";

// The review-page wrapper around Phase0ConfigFields: holds the working config,
// saves it to the developer-only preconfigure route. Editable any time, even
// after the manager has started, though saved answers always win over the seed.

import { useState } from "react";
import { Check } from "lucide-react";
import Phase0ConfigFields from "../../phase0/Phase0ConfigFields";
import type { Phase0Config } from "@/lib/phase0Config";

export default function Phase0ConfigForm({
  orgId,
  initialConfig,
}: {
  orgId: string;
  initialConfig: Phase0Config;
}) {
  const [config, setConfig] = useState<Phase0Config>(initialConfig);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">(
    "idle"
  );

  async function save() {
    setState("saving");
    try {
      const res = await fetch(`/api/portal/orgs/${orgId}/preconfigure`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      if (!res.ok) throw new Error("save failed");
      setState("saved");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-card">
      <Phase0ConfigFields
        value={config}
        onChange={(next) => {
          setConfig(next);
          setState("idle");
        }}
      />
      <div className="mt-5 flex items-center justify-end gap-3 border-t border-zinc-100 pt-4">
        {state === "saved" && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
            <Check className="h-3.5 w-3.5 text-teal-600" strokeWidth={2.5} />
            Saved
          </span>
        )}
        {state === "error" && (
          <span className="text-xs text-clay-600">Could not save. Try again.</span>
        )}
        <button
          onClick={save}
          disabled={state === "saving"}
          className="inline-flex items-center rounded-lg bg-teal-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950 disabled:opacity-60"
        >
          {state === "saving" ? "Saving..." : "Save what we know"}
        </button>
      </div>
    </div>
  );
}
