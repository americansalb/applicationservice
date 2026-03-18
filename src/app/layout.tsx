import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AALB Careers - Join Our Team",
  description: "Explore career opportunities at American Association of Lending Businesses. Find your next role and apply today.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        <nav className="bg-teal-900 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                  <span className="text-teal-900 font-extrabold text-lg">A</span>
                </div>
                <div>
                  <span className="text-xl font-bold tracking-tight">AALB</span>
                  <span className="hidden sm:inline text-teal-200 text-sm ml-2">Careers</span>
                </div>
              </a>
              <div className="flex items-center space-x-6">
                <a href="/" className="text-teal-100 hover:text-white transition-colors text-sm font-medium">
                  Open Roles
                </a>
                <a href="/admin" className="text-teal-300 hover:text-white transition-colors text-sm font-medium">
                  Admin
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="min-h-screen">{children}</main>
        <footer className="bg-teal-950 text-teal-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                    <span className="text-teal-900 font-extrabold text-sm">A</span>
                  </div>
                  <span className="text-white font-bold text-lg">AALB</span>
                </div>
                <p className="text-teal-300 text-sm leading-relaxed">
                  American Association of Lending Businesses. Empowering lending professionals and advancing industry standards.
                </p>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-3">Careers</h3>
                <ul className="space-y-2 text-sm">
                  <li><a href="/" className="hover:text-white transition-colors">Open Positions</a></li>
                  <li><a href="/#about" className="hover:text-white transition-colors">About AALB</a></li>
                  <li><a href="/#culture" className="hover:text-white transition-colors">Our Culture</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-3">Contact</h3>
                <ul className="space-y-2 text-sm">
                  <li>careers@aalb.org</li>
                  <li>Washington, D.C.</li>
                </ul>
              </div>
            </div>
            <div className="border-t border-teal-800 mt-8 pt-8 text-center text-sm text-teal-400">
              &copy; {new Date().getFullYear()} American Association of Lending Businesses. All rights reserved.
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
