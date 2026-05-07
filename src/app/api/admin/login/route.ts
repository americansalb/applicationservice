import { getPool, resetPool } from "@/lib/pg";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

function isConnectivityError(e: unknown) {
  const code = (e as { code?: string } | null)?.code;
  const msg = e instanceof Error ? e.message : "";
  return (
    code === "ENOTFOUND" ||
    code === "ECONNREFUSED" ||
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "EPIPE" ||
    /ENOTFOUND|ECONNREFUSED|ETIMEDOUT|ECONNRESET|EPIPE|getaddrinfo|terminat|Connection terminated/i.test(msg)
  );
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rl = checkRateLimit(`careers-login:${ip}`);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many login attempts. Try again later." },
        { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } }
      );
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const sql = `SELECT "id", "email", "password", "name" FROM "careers_admin_user" WHERE "email" = $1 LIMIT 1`;
    let result;
    try {
      result = await getPool().query(sql, [email]);
    } catch (firstErr) {
      if (!isConnectivityError(firstErr)) throw firstErr;
      console.warn("[admin login] connectivity error, resetting pool and retrying:", (firstErr as Error).message);
      resetPool();
      result = await getPool().query(sql, [email]);
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const token = signToken({ id: user.id, email: user.email });

    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    const connectivity = isConnectivityError(error);
    return NextResponse.json(
      {
        error: connectivity
          ? "Service temporarily unavailable. Please try again shortly."
          : "Login failed",
      },
      { status: connectivity ? 503 : 500 }
    );
  }
}
