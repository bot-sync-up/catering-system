// Seed לדוגמה: מנהל + 3 עובדים + משמרות לשבוע
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encryptField, encryptJson } from "../src/utils/crypto.js";

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash("admin1234", 10);
  await prisma.user.upsert({
    where: { email: "admin@hr.local" },
    update: {},
    create: {
      email: "admin@hr.local",
      passwordHash: adminPass,
      role: "ADMIN",
      employee: {
        create: {
          firstName: "ישראל",
          lastName: "ישראלי",
          hebrewName: "ישראל ישראלי",
          taxId: encryptField("123456789"),
          salary: encryptField("25000"),
          bank: encryptJson({ bankName: "פועלים", branch: "601", account: "12345678" }),
        },
      },
    },
  });

  const empNames = [
    ["דנה", "כהן"],
    ["יוסי", "לוי"],
    ["מיכל", "מזרחי"],
  ];
  for (const [first, last] of empNames) {
    const email = `${first}@hr.local`;
    const pass = await bcrypt.hash("emp12345", 10);
    await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        passwordHash: pass,
        role: "EMPLOYEE",
        employee: {
          create: {
            firstName: first,
            lastName: last,
            hebrewName: `${first} ${last}`,
            salary: encryptField("12000"),
          },
        },
      },
    });
  }

  // משמרות לשבוע הקרוב
  const today = new Date();
  for (let d = 0; d < 7; d++) {
    const date = new Date(today);
    date.setDate(today.getDate() + d);
    await prisma.shift.create({
      data: { date, startTime: "08:00", endTime: "16:00", role: "בוקר" },
    });
    await prisma.shift.create({
      data: { date, startTime: "16:00", endTime: "00:00", role: "ערב" },
    });
  }

  console.log("Seed הושלם. כניסה: admin@hr.local / admin1234");
}

main().finally(() => prisma.$disconnect());
