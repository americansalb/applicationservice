import crypto from "crypto";
import { getPartnersPool } from "./partnersDb";

export async function logAudit(params: {
  action: string;
  userId?: string;
  userRole?: string;
  userEmail?: string;
  organizationId?: string;
  sectionKey?: string;
  detail?: string;
  ip?: string;
}) {
  try {
    const pool = getPartnersPool();
    await pool.query(
      `INSERT INTO "partners_audit_log"
       ("id", "action", "userId", "userRole", "userEmail", "organizationId", "sectionKey", "detail", "ip", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        crypto.randomUUID(),
        params.action,
        params.userId || null,
        params.userRole || null,
        params.userEmail || null,
        params.organizationId || null,
        params.sectionKey || null,
        params.detail || null,
        params.ip || null,
      ]
    );
  } catch (e) {
    console.error("[audit] Failed to log:", e);
  }
}
