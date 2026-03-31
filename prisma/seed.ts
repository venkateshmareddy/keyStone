import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_EMAIL ?? "demo@keystone.local";
  const password = process.env.SEED_PASSWORD ?? "demo-demo";
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    create: { email, passwordHash },
    update: { passwordHash },
  });

  let work = await prisma.category.findFirst({
    where: { userId: user.id, name: "Work" },
  });
  if (!work) {
    work = await prisma.category.create({
      data: { name: "Work", userId: user.id },
    });
  }

  let personal = await prisma.category.findFirst({
    where: { userId: user.id, name: "Personal" },
  });
  if (!personal) {
    personal = await prisma.category.create({
      data: { name: "Personal", userId: user.id },
    });
  }

  const existingWelcome = await prisma.note.findFirst({
    where: {
      categoryId: work.id,
      title: "Welcome to Keystone",
    },
  });

  if (!existingWelcome) {
    await prisma.note.create({
      data: {
        title: "Welcome to Keystone",
        content:
          "# Welcome\n\nThis is a **markdown** note. Try the preview toggle.\n\n- Full-text search\n- Categories\n- Encrypted secrets",
        type: "NOTE",
        categoryId: work.id,
      },
    });
  }

  const existingCmd = await prisma.note.findFirst({
    where: {
      categoryId: work.id,
      title: "Daily backup",
    },
  });

  if (!existingCmd) {
    await prisma.note.create({
      data: {
        title: "Daily backup",
        content: "rsync -av ~/Notes/ /Volumes/Backup/notes/",
        type: "COMMAND",
        categoryId: work.id,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log("Seed OK — login:", email, "/", password);
  // eslint-disable-next-line no-console
  console.log("Sample notebooks:", work.name, ",", personal.name);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
