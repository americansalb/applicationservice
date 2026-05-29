"use client";

import { useState } from "react";
import InterviewBuilder from "./InterviewBuilder";
import PipelineManager from "./PipelineManager";

export default function InterviewsAdmin({ token }: { token: string }) {
  const [sub, setSub] = useState<"rounds" | "candidates">("rounds");
  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1">
        {(
          [
            ["rounds", "Rounds"],
            ["candidates", "Candidates"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setSub(key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              sub === key ? "bg-teal-700 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sub === "rounds" ? (
        <InterviewBuilder token={token} />
      ) : (
        <PipelineManager token={token} />
      )}
    </div>
  );
}
