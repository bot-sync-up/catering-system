/**
 * עוזרים לטקסט עברי, ת.ז., טלפונים ובנקים ישראליים.
 */
import { rand, randInt, pick } from "./rng.js";

const CITIES = [
  "תל אביב", "ירושלים", "חיפה", "ראשון לציון", "פתח תקווה",
  "אשדוד", "נתניה", "באר שבע", "חולון", "בני ברק",
  "רמת גן", "אשקלון", "רחובות", "בת ים", "בית שמש",
  "כפר סבא", "הרצליה", "מודיעין", "רעננה", "רמלה",
  "לוד", "נצרת", "קריית גת", "אילת", "טבריה",
  "גבעתיים", "אלעד", "ביתר עילית", "מודיעין עילית", "ראש העין",
];

const STREETS = [
  "אלנבי", "דיזנגוף", "רוטשילד", "ויצמן", "הרצל",
  "ז'בוטינסקי", "בן יהודה", "אבן גבירול", "סוקולוב", "ביאליק",
  "הנביאים", "יפו", "אגריפס", "המלך ג'ורג'", "שאול המלך",
  "אחד העם", "מוריה", "עזה", "בורוכוב", "השלום",
  "ההגנה", "בלפור", "פנקס", "אושיסקין", "הרב קוק",
  "השומר", "החלוץ", "טשרניחובסקי", "אלכסנדר ינאי", "צה\"ל",
];

const FIRST_NAMES_M = [
  "יוסי", "משה", "אברהם", "דוד", "יצחק",
  "אהרן", "שמואל", "יעקב", "מאיר", "ישראל",
  "יהודה", "אליעזר", "נתן", "שלמה", "אריה",
];

const FIRST_NAMES_F = [
  "שרה", "רחל", "מרים", "לאה", "חנה",
  "אסתר", "רבקה", "דבורה", "תמר", "נעמי",
  "יעל", "מיכל", "אביגיל", "שירה", "טליה",
];

const LAST_NAMES = [
  "כהן", "לוי", "מזרחי", "פרץ", "אברהם",
  "ביטון", "דהן", "אדרי", "אזולאי", "חדד",
  "אוחיון", "טולדנו", "אלבז", "מלכא", "סויסה",
  "גולדברג", "פרידמן", "שטרן", "רוזנברג", "וייס",
];

const BUSINESS_SUFFIXES = ["בע\"מ", "ושות'", "ובניו", "תעשיות", "שירותים"];

export function randomCity(): string {
  return pick(CITIES);
}

export function randomStreet(): string {
  return pick(STREETS);
}

/** מספר טלפון נייד ישראלי: 05x-xxxxxxx */
export function randomMobile(): string {
  const prefix = pick(["050", "052", "053", "054", "055", "058"]);
  const rest = String(randInt(1000000, 9999999));
  return `${prefix}-${rest}`;
}

/** מספר טלפון קווי: 0x-xxxxxxx */
export function randomLandline(): string {
  const prefix = pick(["02", "03", "04", "08", "09"]);
  const rest = String(randInt(1000000, 9999999));
  return `${prefix}-${rest}`;
}

/** מספר ת.ז. עם ספרת ביקורת תקינה */
export function randomNationalId(): string {
  const digits = Array.from({ length: 8 }, () => randInt(0, 9));
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    let d = digits[i] * ((i % 2) + 1);
    if (d > 9) d -= 9;
    sum += d;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return digits.join("") + String(checkDigit);
}

/** ח.פ. (תאגיד) — 9 ספרות, מתחיל ב-5 */
export function randomTaxId(): string {
  const digits = Array.from({ length: 8 }, () => randInt(0, 9));
  return `5${digits.join("")}`;
}

/** חשבון בנק ישראלי: bank-branch-account */
export function randomBankAccount(): string {
  const bank = pick(["10", "12", "11", "20", "04", "31", "14"]);
  const branch = String(randInt(100, 999));
  const account = String(randInt(100000, 999999));
  return `${bank}-${branch}-${account}`;
}

export function randomFirstName(gender: "M" | "F" = rand() < 0.5 ? "M" : "F"): string {
  return gender === "M" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
}

export function randomLastName(): string {
  return pick(LAST_NAMES);
}

export function randomBusinessName(): string {
  const owner = randomLastName();
  const suffix = pick(BUSINESS_SUFFIXES);
  return `${owner} ${suffix}`;
}

export { CITIES, STREETS };
