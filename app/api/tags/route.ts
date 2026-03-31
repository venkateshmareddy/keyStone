import { requireSessionUser, isNextResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { NextResponse } from "next/server";

const tagCreateSchema = z.object({
  name: z.string().min(1).max(80).trim(),
});

export async function GET() {
  const user = await requireSessionUser();
  if (isNextResponse(user)) return user;

  const tags = await prisma.tag.findMany({
    where: {
      noteTags: {
        some: { note: { category: { userId: user.id } } },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(tags);
}

export async function POST(req: Request) {
  const user = await requireSessionUser();
  if (isNextResponse(user)) return user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = tagCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const tag = await prisma.tag.upsert({
    where: { name: parsed.data.name },
    create: { name: parsed.data.name },
    update: {},
  });

  return NextResponse.json(tag, { status: 201 });
}
