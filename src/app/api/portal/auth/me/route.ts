import { NextRequest, NextResponse } from "next/server";
import { userFromToken } from "@/lib/appSession";
import { SESSION_COOKIE } from "@/lib/appAuth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const user = await userFromToken(req.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ user });
}
