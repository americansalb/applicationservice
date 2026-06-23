"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// Clean, local AALB white logo (no external CDN, no cropped-caption variant).
const LOGO_SRC = "/brand/aalb-logo-white.png";

// Brand logo with a graceful text fallback if the remote asset fails to load,
// so the header/footer never render a broken image.
function Logo({ className, opacity }: { className?: string; opacity?: string }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);

  // The image can error before React hydrates and attaches onError, so also
  // check the natural size once mounted to catch a missed failure.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, []);

  if (failed) {
    return (
      <span className={`font-extrabold tracking-tight text-white ${opacity || ""}`}>
        AALB <span className="font-medium text-teal-200">Careers</span>
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={LOGO_SRC}
      alt="AALB"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}

export default function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";
  const isPartners = pathname.startsWith("/partners");
  // The evaluation platform owns its own chrome (its own header/nav), so the
  // careers site header/footer is stripped here.
  const isPortal = pathname.startsWith("/portal");
  // Candidate-facing interview pages get a clean, distraction-free chrome:
  // branded but without the staff "Admin" / "Open Roles" navigation.
  const isInterview =
    pathname.startsWith("/interview") || pathname.startsWith("/r/");

  if (isPartners || isPortal) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (isInterview) {
    return (
      <>
        <nav className="bg-teal-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <a href="/" className="flex items-center" aria-label="AALB Careers">
                <Logo className="h-10" />
              </a>
            </div>
          </div>
        </nav>
        <main className="min-h-screen">{children}</main>
        <footer className="bg-teal-950 text-teal-300">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 text-center">
            <p className="text-xs text-teal-400">
              &copy; {new Date().getFullYear()} Americans Against Language Barriers
            </p>
          </div>
        </footer>
      </>
    );
  }

  return (
    <>
      <nav className="bg-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center">
              <Logo className="h-10" />
            </a>
            <div className="flex items-center space-x-6">
              <a
                href="/#roles"
                className="text-teal-100 hover:text-white transition-colors text-sm font-medium"
              >
                Open Roles
              </a>
              <a
                href="/admin"
                className="text-teal-300 hover:text-white transition-colors text-sm font-medium"
              >
                Admin
              </a>
            </div>
          </div>
        </div>
      </nav>
      <main className="min-h-screen">{children}</main>
      <footer className="bg-teal-950 text-teal-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo className="h-8 opacity-70" opacity="opacity-70" />
            <p className="text-sm text-teal-400">
              &copy; {new Date().getFullYear()} Americans Against Language Barriers
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
