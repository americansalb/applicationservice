import type { Metadata } from "next";
import "./globals.css";
import SiteChrome from "./SiteChrome";

export const metadata: Metadata = {
  title: "AALB Careers - Join Our Team",
  description:
    "Explore career opportunities at Americans Against Language Barriers. Find your next role and apply today.",
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
