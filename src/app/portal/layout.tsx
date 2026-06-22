import type { Metadata } from "next";
import { Fraunces, Source_Sans_3 } from "next/font/google";

// Warm editorial serif for display + a calm humanist sans for UI. Scoped to
// the /portal subtree via CSS variables, so the careers site is unaffected.
const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

const ui = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AALB Evaluation Platform",
    template: "%s · AALB Evaluation Platform",
  },
  robots: { index: false, follow: false },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${display.variable} ${ui.variable} font-ui min-h-screen bg-sand-50 text-ink antialiased`}
    >
      {children}
    </div>
  );
}
