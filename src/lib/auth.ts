import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "aalb-admin-secret-key";

export function signToken(payload: { id: string; email: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; email: string };
  } catch {
    return null;
  }
}
