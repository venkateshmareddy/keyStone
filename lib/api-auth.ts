import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireSessionUser(): Promise<
  { id: string } | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return { id: session.user.id };
}

export function isNextResponse(
  v: { id: string } | NextResponse,
): v is NextResponse {
  return v instanceof NextResponse;
}
