import crypto from "crypto";

// A stateless, signed upload link for an institution's language access plan.
// Mirrors signedUrl.ts: the token encodes the org id and an expiry, signed with
// an HMAC, so no token table is needed. It stays valid (and reusable) until it
// expires, which is acceptable for this low-risk, org-scoped action. The worst
// case is someone uploading a document to one organization's plan record; the
// token grants nothing else, reveals nothing, and cannot read anything back.

const SECRET =
  process.env.PLAN_UPLOAD_SECRET ||
  process.env.JWT_SECRET ||
  process.env.PARTNERS_JWT_SECRET ||
  "aalb-plan-upload-key";

export const PLAN_UPLOAD_TTL_DAYS = 30;
const TTL_MS = PLAN_UPLOAD_TTL_DAYS * 24 * 60 * 60 * 1000;

export function createPlanUploadToken(orgId: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${orgId}:${expires}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

// Returns the org id if the token is well-formed, unexpired, and correctly
// signed; otherwise null. Org ids are uuids (no colons), so splitting is safe.
export function verifyPlanUploadToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 3) return null;
    const [orgId, expiresStr, sig] = parts;
    const expires = parseInt(expiresStr, 10);
    if (!Number.isFinite(expires) || Date.now() > expires) return null;
    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(`${orgId}:${expiresStr}`)
      .digest("hex");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return null;
    if (!crypto.timingSafeEqual(a, b)) return null;
    return orgId;
  } catch {
    return null;
  }
}

export function planUploadUrl(base: string, token: string): string {
  return `${base.replace(/\/+$/, "")}/portal/upload/${token}`;
}
