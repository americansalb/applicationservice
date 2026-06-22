"use client";

import { useEffect, useRef, useState } from "react";

// The real AALB mark (white, for dark surfaces). Same asset the careers site
// uses, with a graceful text fallback if it ever fails to load.
const LOGO_SRC =
  "https://cdn.prod.website-files.com/60bd8dbf37c04966c2f674b4/60ee7042fdbd2e10d46ea03c_Logo2-WhitewithText%26caption-cropped-p-800.png";

export function LogoImage({ className = "h-10" }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return <Wordmark tone="light" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={LOGO_SRC}
      alt="AALB, Americans Against Language Barriers"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

// Typographic wordmark for warm/light surfaces where the white logo can't sit.
export function Wordmark({
  tone = "dark",
  className = "",
}: {
  tone?: "dark" | "light";
  className?: string;
}) {
  const main = tone === "light" ? "text-white" : "text-teal-900";
  const sub = tone === "light" ? "text-teal-200/80" : "text-ink-faint";
  return (
    <span className={`inline-flex items-baseline gap-2 ${className}`}>
      <span className={`font-display text-2xl font-semibold tracking-tight ${main}`}>
        AALB
      </span>
      <span className={`font-ui text-[10px] uppercase tracking-[0.2em] ${sub}`}>
        Evaluation
      </span>
    </span>
  );
}
