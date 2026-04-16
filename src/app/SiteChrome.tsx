"use client";

import { usePathname } from "next/navigation";

export default function SiteChrome({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() || "";
  const isPartners = pathname.startsWith("/partners");

  if (isPartners) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <nav className="bg-teal-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <a href="/" className="flex items-center">
              <img
                src="https://cdn.prod.website-files.com/60bd8dbf37c04966c2f674b4/60ee7042fdbd2e10d46ea03c_Logo2-WhitewithText%26caption-cropped-p-800.png"
                alt="AALB"
                className="h-10"
              />
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
            <img
              src="https://cdn.prod.website-files.com/60bd8dbf37c04966c2f674b4/60ee7042fdbd2e10d46ea03c_Logo2-WhitewithText%26caption-cropped-p-800.png"
              alt="AALB"
              className="h-8 opacity-70"
            />
            <p className="text-sm text-teal-400">
              &copy; {new Date().getFullYear()} Americans Against Language Barriers
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
