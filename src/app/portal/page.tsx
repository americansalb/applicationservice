import { redirect } from "next/navigation";
import { requireUser } from "@/lib/appSession";
import PortalChrome from "./PortalChrome";
import DeveloperDashboard from "./DeveloperDashboard";
import ManagerDashboard from "./ManagerDashboard";
import ProfessionalDashboard from "./ProfessionalDashboard";

export const dynamic = "force-dynamic";

export default async function PortalHome() {
  const user = await requireUser();

  // Anyone created by a developer/manager must set their own password first.
  if (user.mustChangePassword) redirect("/portal/account/password");

  return (
    <PortalChrome
      user={{ name: user.name, email: user.email, role: user.role }}
    >
      {user.role === "DEVELOPER" && <DeveloperDashboard user={user} />}
      {user.role === "MANAGER" && <ManagerDashboard user={user} />}
      {user.role === "PROFESSIONAL" && <ProfessionalDashboard user={user} />}
    </PortalChrome>
  );
}
