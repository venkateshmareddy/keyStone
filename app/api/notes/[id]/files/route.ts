import { requireSessionUser, isNextResponse } from "@/lib/api-auth";
import { prisma } from "@/lib/db";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

type Params = { params: Promise<{ id: string }> };

const UPLOAD_SUBDIR = "uploads";

async function ensureUploadDir(abs: string) {
  await mkdir(abs, { recursive: true });
}

export async function POST(req: Request, { params }: Params) {
  const user = await requireSessionUser();
  if (isNextResponse(user)) return user;
  const { id: noteId } = await params;

  const note = await prisma.note.findFirst({
    where: {
      id: noteId,
      category: { userId: user.id },
      type: "FILE",
    },
  });
  if (!note) {
    return NextResponse.json(
      { error: "Note not found or not a file note" },
      { status: 404 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const max = Number(process.env.UPLOAD_MAX_MB ?? 10) * 1024 * 1024;
  if (buf.length > max) {
    return NextResponse.json({ error: "File too large" }, { status: 413 });
  }

  const ext = path.extname(file.name || "") || "";
  const safeBase = `${randomUUID()}${ext}`;
  const rel = `/${UPLOAD_SUBDIR}/${safeBase}`;
  const absDir = path.join(process.cwd(), "public", UPLOAD_SUBDIR);
  await ensureUploadDir(absDir);
  const absPath = path.join(absDir, safeBase);
  await writeFile(absPath, buf);

  const row = await prisma.file.create({
    data: { noteId, fileUrl: rel },
  });

  return NextResponse.json(row, { status: 201 });
}
