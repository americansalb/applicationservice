import jwt from "jsonwebtoken";

// Resolve the signing secret the same way the platform auth does
// (see src/lib/appAuth.ts): prefer APP_JWT_SECRET — which server.js provisions
// at boot and persists in app_platform_config, so it is always present on the
// deployed service — then JWT_SECRET. In production a missing secret is a hard
// error; we never silently fall back to a shared, source-visible default, which
// would let anyone forge an admin token and read every applicant's PII.
function getSecret(): string {
  const s = process.env.APP_JWT_SECRET || process.env.JWT_SECRET;
  if (s && s.length > 0) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "APP_JWT_SECRET or JWT_SECRET must be set in production to sign admin tokens."
    );
  }
  return "aalb-admin-dev-secret-change-me";
}

export function signToken(payload: { id: string; email: string }) {
  return jwt.sign(payload, getSecret(), { expiresIn: "24h" });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, getSecret()) as { id: string; email: string };
  } catch {
    return null;
  }
}
