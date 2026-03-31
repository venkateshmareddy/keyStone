import { requireSessionUser, isNextResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { categoryUpdateSchema } from "@/lib/validation";
import { NextResponse } from "next/server";

type Params = { params: Promise<{ id: string }> };

async function categoryOwned(userId: string, id: string) {
  return prisma.category.findFirst({
    where: { id, userId },
  });
}

export async function PATCH(req: Request, { params }: Params) {
  const user = await requireSessionUser();
  if (isNextResponse(user)) return user;
  const { id } = await params;

  const existing = await categoryOwned(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = categoryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updated = await prisma.category.update({
    where: { id },
    data: { name: parsed.data.name },
    include: { _count: { select: { notes: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await requireSessionUser();
  if (isNextResponse(user)) return user;
  const { id } = await params;

  const existing = await categoryOwned(user.id, id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
