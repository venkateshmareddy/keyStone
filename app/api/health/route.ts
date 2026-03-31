import { NextResponse } from "next/server";

/**
 * Diagnose deploy issues (no secrets returned). Should return 200 when the function runs.
 */
export async function GET() {
  const hasAuthSecret = Boolean(
    process.env.AUTH_SECRET?.length ?? process.env.NEXTAUTH_SECRET?.length,
  );
  const hasDb = Boolean(process.env.DATABASE_URL?.length);
  return NextResponse.json({
    ok: true,
    hasAuthSecret,
    hasDb,
    node: process.version,
  });
}
