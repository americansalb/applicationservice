"use client";

import { useEffect, useState } from "react";
import type { InterviewQuestion } from "@/lib/interviews";
import InterviewClient from "@/app/interview/[slug]/InterviewClient";
import LiveBooking from "./LiveBooking";

type AccessData = {
  token: string;
  status: string;
  round: number;
  title: string;
  intro: string | null;
  roleTitle: string | null;
  format: string;
  candidate: { fullName: string; email: string; phone: string | null };
  closed?: boolean;
  done?: boolean;
  // self-paced
  videoRequired?: boolean;
  questions?: InterviewQuestion[];
  // live
  live?: {
    timeZone: string;
    durationMins: number;
    locationLabel: string | null;
    slots: { iso: string; taken: boolean }[];
  };
  bookedSlot?: string | null;
};

export default function GatedRound({ token }: { token: string }) {
  const [data, setData] = useState<AccessData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/access/${token}`);
        const json = await res.json().catch(() => ({}));
        if (!active) return;
        if (!res.ok) {
          setError(json.error || "This interview link is invalid or has expired.");
          return;
        }
        setData(json);
      } catch {
        if (active) setError("Couldn't load your interview. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return <Centered>Loading your interview…</Centered>;
  }
  if (error || !data) {
    return (
      <Centered>
        <p className="text-gray-900 font-semibold mb-1">We couldn&apos;t open this interview</p>
        <p className="text-gray-500 text-sm">{error || "Link invalid or expired."}</p>
      </Centered>
    );
  }
  if (data.closed) {
    return (
      <Centered>
        <p className="text-gray-900 font-semibold mb-1">This interview is closed</p>
        <p className="text-gray-500 text-sm">
          Thanks for your interest. The hiring team will be in touch if anything changes.
        </p>
      </Centered>
    );
  }

  // Self-paced already submitted.
  if (data.format !== "live" && data.done) {
    return (
      <Centered>
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-green-700 text-2xl">✓</span>
        </div>
        <p className="text-gray-900 font-semibold mb-1">Already submitted</p>
        <p className="text-gray-500 text-sm">
          You&apos;ve completed this round. We&apos;ll email you about next steps.
        </p>
      </Centered>
    );
  }

  if (data.format === "live" && data.live) {
    return (
      <LiveBooking
        token={token}
        title={data.title}
        round={data.round}
        roleTitle={data.roleTitle}
        intro={data.intro}
        live={data.live}
        initialBookedSlot={data.bookedSlot || null}
      />
    );
  }

  return (
    <InterviewClient
      slug=""
      title={data.title}
      round={data.round}
      roleTitle={data.roleTitle}
      intro={data.intro}
      videoRequired={!!data.videoRequired}
      questions={data.questions || []}
      submitUrl={`/api/access/${token}/submit`}
      prefill={{
        fullName: data.candidate.fullName,
        email: data.candidate.email,
        phone: data.candidate.phone || "",
      }}
      collectInfo={false}
    />
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-100 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 max-w-md text-center">
        {children}
      </div>
    </div>
  );
}
