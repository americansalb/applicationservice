import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { withDbRetry } from "@/lib/dbRetry";
import {
  SESSION_COOKIE,
  verifySession,
  type AppRole,
} from "@/lib/appAuth";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  status: string;
  mustChangePassword: boolean;
  managerId: string | null;
};

// Resolve a session from a raw cookie value. The DB lookup is the source of
// truth: a token alone never grants access, so disabled/deleted accounts are
// rejected immediately even while their JWT is still unexpired.
export async function userFromToken(
  token: string | undefined | null
): Promise<SessionUser | null> {
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload) return null;

  try {
    const user = await withDbRetry("portal.session", () =>
      prisma.appUser.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          mustChangePassword: true,
          managerId: true,
        },
      })
    );
    if (!user || user.status !== "active") return null;
    return user as SessionUser;
  } catch (e) {
    console.error("[portal] session lookup failed:", e);
    return null;
  }
}

// For use in Server Components / pages.
export async function getSessionUser(): Promise<SessionUser | null> {
  return userFromToken(cookies().get(SESSION_COOKIE)?.value);
}

// Redirects to the login page when there is no valid session.
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/portal/login");
  return user;
}
