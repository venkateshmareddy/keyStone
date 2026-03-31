import { requireSessionUser, isNextResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { categoryCreateSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

export async function GET() {
  const user = await requireSessionUser();
  if (isNextResponse(user)) return user;

  const categories = await prisma.category.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { notes: true } } },
  });

  return NextResponse.json(categories);
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

  const parsed = categoryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const category = await prisma.category.create({
    data: { name: parsed.data.name, userId: user.id },
    include: { _count: { select: { notes: true } } },
  });

  return NextResponse.json(category, { status: 201 });
}
