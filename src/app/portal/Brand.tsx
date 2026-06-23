"use client";

import { useEffect, useRef, useState } from "react";

// The real AALB logo, served locally (no external CDN, no cramped caption).
//   tone="light"  → all-white wordmark for dark surfaces (teal sidebar/panel)
//   tone="dark"   → full-color logo for light surfaces (auth cards)
const LOGO_SRC: Record<"light" | "dark", string> = {
  light: "/brand/aalb-logo-white.png",
  dark: "/brand/aalb-logo.png",
};

export function LogoImage({
  tone = "light",
  className = "h-10",
}: {
  tone?: "light" | "dark";
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // The image can error before React hydrates and attaches onError, so also
  // check the natural size once mounted to catch a missed failure.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) return <Wordmark tone={tone} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={LOGO_SRC[tone]}
      alt="AALB — Americans Against Language Barriers"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

// Typographic wordmark, used only as a graceful fallback if the logo image
// ever fails to load, so a surface never renders a broken image.
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
