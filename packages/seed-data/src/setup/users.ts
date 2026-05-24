/**
 * 12 משתמשים אמיתיים — מנכ"ל, תפעול, שף, מכירות, סוכנים, נהגים, שפים, מלצרים.
 * Password אחיד "demo-pass-2026" — bcrypt hash.
 */
import bcrypt from "bcryptjs";
import { did } from "../utils/ids.js";
import { randomMobile } from "../utils/hebrew.js";
import { assignRole } from "./roles.js";
import type { SeedContext } from "../context.js";

export interface UserSeed {
  key: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  position: string;
  department?: string;
}

export const USERS: UserSeed[] = [
  // הנהלה
  { key: "yossi-levi", firstName: "יוסי", lastName: "לוי", email: "yossi.levi@taimim.co.il", role: "owner", position: "מנכ\"ל", department: "הנהלה" },
  { key: "sara-cohen", firstName: "שרה", lastName: "כהן", email: "sara.cohen@taimim.co.il", role: "manager", position: "מנהלת תפעול", department: "תפעול" },
  // מטבח
  { key: "moshe-avraham", firstName: "משה", lastName: "אברהם", email: "moshe.avraham@taimim.co.il", role: "chef", position: "שף ראשי", department: "מטבח" },
  { key: "david-mizrahi", firstName: "דוד", lastName: "מזרחי", email: "david.mizrahi@taimim.co.il", role: "chef", position: "שף משנה", department: "מטבח" },
  { key: "yaakov-peretz", firstName: "יעקב", lastName: "פרץ", email: "yaakov.peretz@taimim.co.il", role: "chef", position: "סו שף", department: "מטבח" },
  // מכירות
  { key: "rachel-goldberg", firstName: "רחל", lastName: "גולדברג", email: "rachel.goldberg@taimim.co.il", role: "sales", position: "מנהלת מכירות", department: "מכירות" },
  { key: "ester-friedman", firstName: "אסתר", lastName: "פרידמן", email: "ester.friedman@taimim.co.il", role: "sales", position: "סוכנת מכירות", department: "מכירות" },
  { key: "miriam-azulay", firstName: "מרים", lastName: "אזולאי", email: "miriam.azulay@taimim.co.il", role: "sales", position: "סוכנת מכירות", department: "מכירות" },
  { key: "avi-biton", firstName: "אבי", lastName: "ביטון", email: "avi.biton@taimim.co.il", role: "sales", position: "סוכן מכירות", department: "מכירות" },
  // משלוחים
  { key: "itzik-dahan", firstName: "יצחק", lastName: "דהן", email: "itzik.dahan@taimim.co.il", role: "driver", position: "נהג ראשי", department: "לוגיסטיקה" },
  { key: "shlomi-edri", firstName: "שלמה", lastName: "אדרי", email: "shlomi.edri@taimim.co.il", role: "driver", position: "נהג", department: "לוגיסטיקה" },
  // שטח
  { key: "lea-stern", firstName: "לאה", lastName: "שטרן", email: "lea.stern@taimim.co.il", role: "waiter", position: "מנהלת מלצרים", department: "שטח" },
];

const PASSWORD = "demo-pass-2026";

export interface SeededUser extends UserSeed {
  id: string;
}

export async function seedUsers(ctx: SeedContext): Promise<SeededUser[]> {
  const { prisma, tenantId } = ctx;
  const hash = await bcrypt.hash(PASSWORD, 10);
  const results: SeededUser[] = [];

  for (const u of USERS) {
    const id = did(`user:${tenantId}:${u.key}`);
    await prisma.user.upsert({
      where: { id },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        phone: randomMobile(),
        status: "ACTIVE",
      },
      create: {
        id,
        tenantId,
        email: u.email,
        phone: randomMobile(),
        passwordHash: hash,
        firstName: u.firstName,
        lastName: u.lastName,
        status: "ACTIVE",
        preferences: { language: "he", direction: "rtl" } as any,
        metadata: { position: u.position, department: u.department } as any,
      },
    });

    await assignRole(ctx, id, u.role);
    results.push({ ...u, id });
  }

  return results;
}
