/**
 * 50 לקוחות אמיתיים — מעורב B2B (הייטק/מלון/בי"ס/גנים), B2C (אירועים), Institution.
 */
import type { CustomerType } from "@prisma/client";
import { did } from "../utils/ids.js";
import { randomTaxId, randomMobile, randomLandline } from "../utils/hebrew.js";
import { scaled } from "../context.js";
import type { SeedContext } from "../context.js";

interface CustomerSpec {
  key: string;
  type: CustomerType;
  name: string;
  hebrewName?: string;
  email?: string;
  category: string;
  creditLimit?: number;
  paymentTermDays?: number;
}

export const CUSTOMERS: CustomerSpec[] = [
  // B2B Hi-tech
  { key: "wix", type: "BUSINESS", name: "Wix.com Ltd", hebrewName: "וויקס", email: "office@wix.com", category: "hitech", creditLimit: 200000, paymentTermDays: 60 },
  { key: "monday", type: "BUSINESS", name: "monday.com", hebrewName: "מאנדיי", email: "office@monday.com", category: "hitech", creditLimit: 150000, paymentTermDays: 60 },
  { key: "checkpoint", type: "BUSINESS", name: "Check Point", hebrewName: "צ'ק פוינט", email: "events@checkpoint.com", category: "hitech", creditLimit: 250000, paymentTermDays: 45 },
  { key: "playtika", type: "BUSINESS", name: "Playtika", hebrewName: "פלייטיקה", email: "office@playtika.com", category: "hitech", creditLimit: 180000, paymentTermDays: 45 },
  { key: "lightricks", type: "BUSINESS", name: "Lightricks", hebrewName: "לייטריקס", email: "hr@lightricks.com", category: "hitech", creditLimit: 100000, paymentTermDays: 30 },
  { key: "fiverr", type: "BUSINESS", name: "Fiverr", hebrewName: "פייבר", email: "office@fiverr.com", category: "hitech", creditLimit: 120000, paymentTermDays: 30 },
  { key: "papaya", type: "BUSINESS", name: "Papaya Global", hebrewName: "פפאיה גלובל", email: "office@papayaglobal.com", category: "hitech", creditLimit: 90000, paymentTermDays: 45 },
  { key: "salesforce", type: "BUSINESS", name: "Salesforce Israel", hebrewName: "סיילספורס ישראל", email: "office@salesforce.com", category: "hitech", creditLimit: 150000, paymentTermDays: 60 },
  // B2B Hotel
  { key: "dan-tlv", type: "BUSINESS", name: "Dan Tel-Aviv", hebrewName: "מלון דן תל אביב", email: "fb@dan.co.il", category: "hotel", creditLimit: 80000, paymentTermDays: 30 },
  { key: "hilton-tlv", type: "BUSINESS", name: "Hilton Tel-Aviv", hebrewName: "הילטון תל אביב", email: "events@hilton.com", category: "hotel", creditLimit: 100000, paymentTermDays: 30 },
  { key: "leonardo", type: "BUSINESS", name: "Leonardo Hotels", hebrewName: "לאונרדו מלונות", email: "fb@leonardo.co.il", category: "hotel", creditLimit: 70000, paymentTermDays: 45 },
  { key: "isrotel", type: "BUSINESS", name: "Isrotel", hebrewName: "ישרוטל", email: "office@isrotel.co.il", category: "hotel", creditLimit: 60000, paymentTermDays: 30 },
  // B2B School/Kindergarten
  { key: "hertzog", type: "BUSINESS", name: "מכללת הרצוג", hebrewName: "מכללת הרצוג", email: "office@herzog.ac.il", category: "education", creditLimit: 50000, paymentTermDays: 60 },
  { key: "tau", type: "BUSINESS", name: "אוניברסיטת תל אביב", hebrewName: "אונ' תל אביב", email: "catering@tau.ac.il", category: "education", creditLimit: 150000, paymentTermDays: 60 },
  { key: "huji", type: "BUSINESS", name: "האוניברסיטה העברית", hebrewName: "האוני' העברית", email: "catering@huji.ac.il", category: "education", creditLimit: 130000, paymentTermDays: 60 },
  { key: "gan-yeladim-tlv", type: "BUSINESS", name: "גן הילדים שלי", hebrewName: "גן הילדים שלי", email: "info@gan-shelii.co.il", category: "education", creditLimit: 20000, paymentTermDays: 30 },
  { key: "gan-tinokot-jrs", type: "BUSINESS", name: "מעון תינוקות שמש", hebrewName: "מעון שמש", email: "info@shemesh-gan.co.il", category: "education", creditLimit: 15000, paymentTermDays: 30 },
  { key: "tichon-hadash", type: "BUSINESS", name: "תיכון חדש תל אביב", hebrewName: "תיכון חדש", email: "office@tichon-hadash.co.il", category: "education", creditLimit: 35000, paymentTermDays: 60 },
  // B2C — אירועים פרטיים
  { key: "berkowitz-wedding", type: "INDIVIDUAL", name: "משפחת ברקוביץ", category: "wedding", paymentTermDays: 0 },
  { key: "cohen-wedding", type: "INDIVIDUAL", name: "משפחת כהן (חתונה)", category: "wedding", paymentTermDays: 0 },
  { key: "levi-wedding", type: "INDIVIDUAL", name: "משפחת לוי (חתונה)", category: "wedding", paymentTermDays: 0 },
  { key: "mizrahi-wedding", type: "INDIVIDUAL", name: "משפחת מזרחי (חתונה)", category: "wedding", paymentTermDays: 0 },
  { key: "perl-wedding", type: "INDIVIDUAL", name: "משפחת פרל", category: "wedding", paymentTermDays: 0 },
  { key: "azulay-brit", type: "INDIVIDUAL", name: "משפחת אזולאי (ברית)", category: "brit", paymentTermDays: 0 },
  { key: "elbaz-brit", type: "INDIVIDUAL", name: "משפחת אלבז (ברית)", category: "brit", paymentTermDays: 0 },
  { key: "dahan-brit", type: "INDIVIDUAL", name: "משפחת דהן (ברית)", category: "brit", paymentTermDays: 0 },
  { key: "stern-bar-mitzvah", type: "INDIVIDUAL", name: "משפחת שטרן (בר מצווה)", category: "bar_mitzvah", paymentTermDays: 0 },
  { key: "rosenberg-bar-mitzvah", type: "INDIVIDUAL", name: "משפחת רוזנברג", category: "bar_mitzvah", paymentTermDays: 0 },
  { key: "friedman-bar-mitzvah", type: "INDIVIDUAL", name: "משפחת פרידמן", category: "bar_mitzvah", paymentTermDays: 0 },
  { key: "weiss-bat-mitzvah", type: "INDIVIDUAL", name: "משפחת וייס (בת מצווה)", category: "bat_mitzvah", paymentTermDays: 0 },
  { key: "goldberg-bat-mitzvah", type: "INDIVIDUAL", name: "משפחת גולדברג", category: "bat_mitzvah", paymentTermDays: 0 },
  { key: "abuhatzira-engagement", type: "INDIVIDUAL", name: "משפחת אבוחצירא", category: "engagement", paymentTermDays: 0 },
  { key: "soussa-sheva", type: "INDIVIDUAL", name: "משפחת סויסה (שבע ברכות)", category: "sheva_brachot", paymentTermDays: 0 },
  // Institution
  { key: "clalit", type: "ORGANIZATION", name: "כללית", hebrewName: "שירותי בריאות כללית", email: "events@clalit.co.il", category: "healthcare", creditLimit: 200000, paymentTermDays: 90 },
  { key: "maccabi", type: "ORGANIZATION", name: "מכבי", hebrewName: "מכבי שירותי בריאות", email: "office@maccabi.co.il", category: "healthcare", creditLimit: 150000, paymentTermDays: 90 },
  { key: "meuhedet", type: "ORGANIZATION", name: "מאוחדת", hebrewName: "מאוחדת", email: "office@meuhedet.co.il", category: "healthcare", creditLimit: 100000, paymentTermDays: 90 },
  { key: "leumit", type: "ORGANIZATION", name: "לאומית", hebrewName: "לאומית", email: "office@leumit.co.il", category: "healthcare", creditLimit: 80000, paymentTermDays: 60 },
  { key: "ichilov", type: "ORGANIZATION", name: "איכילוב", hebrewName: "בית חולים איכילוב", email: "fb@tasmc.health.gov.il", category: "healthcare", creditLimit: 90000, paymentTermDays: 60 },
  { key: "tzahal-bsis-1", type: "GOVERNMENT", name: "צה\"ל - בסיס מבני", hebrewName: "בסיס מבני", category: "military", creditLimit: 300000, paymentTermDays: 90 },
  { key: "tzahal-yehida-amam", type: "GOVERNMENT", name: "צה\"ל - יחידת אמ\"ן", hebrewName: "יחידת אמ\"ן", category: "military", creditLimit: 200000, paymentTermDays: 90 },
  { key: "police-merhav", type: "GOVERNMENT", name: "משטרת ישראל - מרחב דן", hebrewName: "משטרה - מרחב דן", category: "government", creditLimit: 80000, paymentTermDays: 90 },
  { key: "amuta-yad", type: "ORGANIZATION", name: "עמותת יד שרה", hebrewName: "יד שרה", email: "office@yadsarah.org.il", category: "nonprofit", creditLimit: 40000, paymentTermDays: 60 },
  { key: "amuta-latet", type: "ORGANIZATION", name: "עמותת לתת", hebrewName: "לתת", email: "info@latet.org.il", category: "nonprofit", creditLimit: 50000, paymentTermDays: 60 },
  { key: "amuta-ezra", type: "ORGANIZATION", name: "עמותת עזרא ובניו", hebrewName: "עזרא ובניו", category: "nonprofit", creditLimit: 30000, paymentTermDays: 60 },
  { key: "iriya-tlv", type: "GOVERNMENT", name: "עיריית תל אביב", hebrewName: "עיריית ת\"א", email: "office@tel-aviv.gov.il", category: "government", creditLimit: 200000, paymentTermDays: 90 },
  { key: "iriya-jrs", type: "GOVERNMENT", name: "עיריית ירושלים", hebrewName: "עיריית ירושלים", email: "office@jerusalem.muni.il", category: "government", creditLimit: 150000, paymentTermDays: 90 },
  // B2C נוספים — ימי הולדת, אירועים קטנים
  { key: "perez-birthday", type: "INDIVIDUAL", name: "משפחת פרץ (יום הולדת)", category: "birthday", paymentTermDays: 0 },
  { key: "abraham-birthday", type: "INDIVIDUAL", name: "משפחת אברהם", category: "birthday", paymentTermDays: 0 },
  { key: "tubul-anniversary", type: "INDIVIDUAL", name: "משפחת טובול", category: "anniversary", paymentTermDays: 0 },
  { key: "edri-housewarming", type: "INDIVIDUAL", name: "משפחת אדרי", category: "private", paymentTermDays: 0 },
  { key: "ben-david-private", type: "INDIVIDUAL", name: "משפחת בן דוד", category: "private", paymentTermDays: 0 },
  { key: "shitrit-corporate", type: "BUSINESS", name: "שטרית ושות' רו\"ח", hebrewName: "שטרית ושות'", email: "office@shitrit-cpa.co.il", category: "business", creditLimit: 25000, paymentTermDays: 45 },
];

export interface SeededCustomer extends CustomerSpec {
  id: string;
}

export async function seedCustomers(ctx: SeedContext): Promise<SeededCustomer[]> {
  const { prisma, tenantId, factor } = ctx;
  const count = scaled(CUSTOMERS.length, factor);
  const selected = CUSTOMERS.slice(0, count);
  const out: SeededCustomer[] = [];

  for (const c of selected) {
    const id = did(`customer:${tenantId}:${c.key}`);
    await prisma.customer.upsert({
      where: { id },
      update: {
        name: c.name,
        hebrewName: c.hebrewName ?? null,
        email: c.email ?? null,
        type: c.type,
        isActive: true,
      },
      create: {
        id,
        tenantId,
        type: c.type,
        name: c.name,
        hebrewName: c.hebrewName ?? null,
        email: c.email ?? null,
        phone: c.type === "INDIVIDUAL" ? randomMobile() : randomLandline(),
        taxId: c.type === "INDIVIDUAL" ? null : randomTaxId(),
        creditLimit: c.creditLimit ? (c.creditLimit as any) : null,
        paymentTermDays: c.paymentTermDays ?? null,
        isActive: true,
        metadata: { category: c.category, source: "seed" } as any,
      },
    });
    out.push({ ...c, id });
  }

  return out;
}
