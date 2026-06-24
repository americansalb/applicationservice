import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { DEV_BOOTSTRAP_EMAIL, devReclaimOpen } from "@/lib/appBootstrap";
import { LogoImage } from "../Brand";
import ClaimForm from "./ClaimForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Developer setup",
  robots: { index: false, follow: false },
};

export default async function ClaimPage() {
  let claimable = false;
  try {
    const u = await prisma.appUser.findUnique({
      where: { email: DEV_BOOTSTRAP_EMAIL },
      select: { role: true, mustChangePassword: true },
    });
    // Missing account → allow first-time bootstrap. Existing account → only a
    // DEVELOPER that's unclaimed or within the recovery window.
    claimable =
      !u || (u.role === "DEVELOPER" && (u.mustChangePassword || devReclaimOpen()));
  } catch {
    // If the DB is briefly unreachable, treat as not-claimable; refresh retries.
    claimable = false;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-zinc-50 to-zinc-100/60 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <LogoImage tone="dark" className="h-12" />
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-8 shadow-raised sm:p-10">
          {claimable ? (
            <ClaimForm email={DEV_BOOTSTRAP_EMAIL} />
          ) : (
            <div className="text-center">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Setup complete
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                This developer account has already been set up. For security,
                this page only works once.
              </p>
              <a
                href="/portal/login"
                className="mt-6 inline-flex rounded-lg bg-teal-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-teal-950"
              >
                Go to sign in
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
