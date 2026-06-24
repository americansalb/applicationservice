import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { LogoImage } from "../../Brand";
import { verifyPlanUploadToken } from "@/lib/planUpload";
import UploadForm from "./UploadForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Upload language access plan",
  robots: { index: false, follow: false },
};

// Public, token-gated page so a colleague can upload an institution's language
// access plan without an account. The signed token carries the org id; we verify
// it and resolve the org name for display. Mirrors the invitation accept page.
export default async function PlanUploadPage({
  params,
}: {
  params: { token: string };
}) {
  const orgId = verifyPlanUploadToken(params.token);
  let orgName: string | null = null;
  if (orgId) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      });
      orgName = org?.name ?? null;
    } catch {
      orgName = null;
    }
  }
  const valid = !!orgId && !!orgName;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sand-50 to-sand-100/60 px-6 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <LogoImage tone="dark" className="h-12" />
        </div>
        <div className="rounded-2xl border border-sand-200/80 bg-white p-8 shadow-raised sm:p-10">
          {valid ? (
            <UploadForm token={params.token} orgName={orgName as string} />
          ) : (
            <div className="text-center">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink">
                Upload link unavailable
              </h1>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                This upload link is invalid or has expired. Please ask whoever
                sent it for a new one.
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
