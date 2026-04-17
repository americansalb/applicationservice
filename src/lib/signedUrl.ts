import crypto from "crypto";

const SECRET = process.env.PARTNERS_JWT_SECRET || process.env.JWT_SECRET || "aalb-signed-url-key";
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function createDownloadToken(fileId: string): string {
  const expires = Date.now() + TTL_MS;
  const payload = `${fileId}:${expires}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  return Buffer.from(`${payload}:${sig}`).toString("base64url");
}

export function verifyDownloadToken(token: string, fileId: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64url").toString();
    const parts = decoded.split(":");
    if (parts.length !== 3) return false;
    const [id, expiresStr, sig] = parts;
    if (id !== fileId) return false;
    const expires = parseInt(expiresStr, 10);
    if (Date.now() > expires) return false;
    const expected = crypto.createHmac("sha256", SECRET).update(`${id}:${expiresStr}`).digest("hex");
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}
