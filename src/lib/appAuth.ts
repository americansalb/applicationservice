import jwt from "jsonwebtoken";

// Reuses JWT_SECRET (already required in production for the existing admin
// auth). A dedicated APP_JWT_SECRET can override it. In production we refuse to
// fall back to a known development value: a missing secret is a hard error,
// not a silently-insecure deployment.
function getSecret(): string {
  const s = process.env.APP_JWT_SECRET || process.env.JWT_SECRET;
  if (s && s.length > 0) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "APP_JWT_SECRET or JWT_SECRET must be set in production to sign portal sessions."
    );
  }
  return "aalb-portal-dev-secret-change-me";
}

export const SESSION_COOKIE = "aalb_portal_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 hours

export const APP_ROLES = ["DEVELOPER", "MANAGER", "PROFESSIONAL"] as const;
export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_LABELS: Record<AppRole, string> = {
  DEVELOPER: "Developer",
  MANAGER: "Manager",
  PROFESSIONAL: "Professional",
};

export type AppSessionToken = {
  sub: string;
  role: AppRole;
};

export function signSession(payload: AppSessionToken): string {
  return jwt.sign(payload, getSecret(), { expiresIn: SESSION_MAX_AGE_SECONDS });
}

export function verifySession(token: string): AppSessionToken | null {
  try {
    return jwt.verify(token, getSecret()) as AppSessionToken;
  } catch {
    return null;
  }
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}
