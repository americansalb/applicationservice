import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "AALB Evaluation Platform",
    template: "%s · AALB Evaluation Platform",
  },
  // Internal application — keep it out of search indexes.
  robots: { index: false, follow: false },
};

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
