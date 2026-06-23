"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";

// The assessment step flows (credential upload, scheduling, etc.) aren't built
// yet. Rather than dead-ending, the primary action acknowledges and sets the
// honest expectation that the step will open here.
export default function StepActionButton({ label }: { label: string }) {
  const [clicked, setClicked] = useState(false);

  if (clicked) {
    return (
      <p className="inline-flex items-center gap-2 rounded-lg bg-teal-50 px-4 py-2.5 text-sm text-teal-800 ring-1 ring-inset ring-teal-700/15">
        <Check className="h-4 w-4" strokeWidth={2.5} />
        Got it — we&rsquo;ll email you the moment this step opens.
      </p>
    );
  }

  return (
    <button
      onClick={() => setClicked(true)}
      className="inline-flex items-center gap-2 rounded-lg bg-teal-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-950"
    >
      {label}
      <ArrowRight className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
