import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET =
  process.env.PARTNERS_JWT_SECRET ||
  process.env.JWT_SECRET ||
  "aalb-partners-secret-key";

export type PartnerTokenPayload = {
  id: string;
  email: string;
  role: "admin" | "partner";
  organizationId?: string;
};

export function signPartnerToken(payload: PartnerTokenPayload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyPartnerToken(token: string): PartnerTokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as PartnerTokenPayload;
  } catch {
    return null;
  }
}

export function getTokenFromRequest(req: NextRequest): PartnerTokenPayload | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return verifyPartnerToken(header.slice(7));
}

export function requireAdmin(req: NextRequest): PartnerTokenPayload | null {
  const token = getTokenFromRequest(req);
  if (!token || token.role !== "admin") return null;
  return token;
}

export function requirePartner(req: NextRequest): PartnerTokenPayload | null {
  const token = getTokenFromRequest(req);
  if (!token || token.role !== "partner" || !token.organizationId) return null;
  return token;
}
