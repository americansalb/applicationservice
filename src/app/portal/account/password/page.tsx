import type { Metadata } from "next";
import { requireUser } from "@/lib/appSession";
import PortalChrome from "../../PortalChrome";
import ChangePasswordForm from "./ChangePasswordForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Change password" };

export default async function PasswordPage() {
  const user = await requireUser();

  return (
    <PortalChrome
      user={{ name: user.name, email: user.email, role: user.role }}
    >
      <div className="mx-auto max-w-lg">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">
          {user.mustChangePassword ? "Set your password" : "Change password"}
        </h1>
        <p className="mt-1.5 text-[15px] text-ink-soft">
          {user.mustChangePassword
            ? "Choose a new password to finish setting up your account."
            : "Update the password used to sign in to your account."}
        </p>
        <div className="mt-6">
          <ChangePasswordForm mustChange={user.mustChangePassword} />
        </div>
      </div>
    </PortalChrome>
  );
}
