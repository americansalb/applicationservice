import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "./SiteChrome";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const description =
  "Explore career opportunities at Americans Against Language Barriers. Find your next role and apply today.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AALB Careers — Join Our Team",
    template: "%s · AALB Careers",
  },
  description,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: SITE_URL,
    title: "AALB Careers — Join Our Team",
    description,
  },
  twitter: {
    card: "summary",
    title: "AALB Careers — Join Our Team",
    description,
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
